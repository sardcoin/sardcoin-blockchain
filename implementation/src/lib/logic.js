/**
 * The deadline for editing a coupon is expired, the coupon is now available.
 * @param {eu.sardcoin.transactions.PublishCoupon} tx The transaction instance.
 * @transaction
 * 
 * CdU_3a
 */
async function onPublishCoupon(tx){
  result = fxPublishCoupon(tx);

  // Save the updated coupon
  const a = await getAssetRegistry('eu.sardcoin.assets.Coupon');
  await a.update(result.coupon);
}

function fxPublishCoupon(tx){
  // The coupon must be in the CREATED state
  if(tx.coupon.state !== 'CREATED'){
    throw new Error('Only CREATED coupons can be published');
  }

  // The coupon must be created more than 24h ago
  var editDeadline = new Date(tx.coupon.creationTime.getTime() + (60*60*1000*24));
  if(tx.timestamp < editDeadline){
    throw new Error('Edit deadline not expired yet');
  }

  tx.coupon.state = 'AVAILABLE';
}



/**
 * A producer deletes a coupon.
 * @param {eu.sardcoin.transactions.DeleteCoupon} tx The transaction instance.
 * @transaction
 * 
 * CdU_3b
 */
async function onDeleteCoupon(tx){

  result = fxDeleteCoupon(tx);

  // Save the updated coupon
  const a = await getAssetRegistry('eu.sardcoin.assets.Coupon');
  await a.update(result.coupon);
}

function fxDeleteCoupon(tx){
  // The caller must be the producer of the coupon
  if(tx.caller !== tx.coupon.producer){
    throw new Error('Only the Producer of this coupon is authorized to delete it');
  }

  // The coupon must be in the CREATED state and the must be created less than 24h ago
  var editDeadline = new Date(tx.coupon.creationTime.getTime() + (60*60*1000*24));
  if((tx.timestamp > editDeadline) || (tx.coupon.state !== 'CREATED')){
    throw new Error('Edit deadline expired');
  }

  // The coupon is now CANCELED
  tx.coupon.state = 'CANCELED';

  return tx;
}



/**
* A Producer assigns an action to either an Executor or a Verifier.
* @param {it.goscore.p1.transactions.AssignAction} tx The transaction instance.
* @transaction
*
* CdU_10
*
async function onAssignAction(tx){

  result = fxAssignAction(tx);
  
  // Save the updated action
  const t = await getAssetRegistry('it.goscore.p1.assets.Action');
  await t.update(result.action);
}

function fxAssignAction(tx){
  // The caller must be the producer of the action
  if(tx.caller !== tx.action.parentTask.producer){
    throw new Error('Only the Producer of this action is authorized to assign it');
  }
  
  // Checks if either one executor or one verifier has been specified
  result = checkActionParticipants(tx.executor, tx.verifier);

  // Update action's state 
  if(result == 1){
    tx.action.executor = tx.executor;
  }
  else{
    tx.action.verifier = tx.verifier;
  }

  return tx;
}


/**
* An Executor or a Verifier accepts the assigned action.
* @param {it.goscore.p1.transactions.AcceptAction} tx The transaction instance.
* @transaction
*
* CdU_12
*
async function onAcceptAction(tx){

  result = fxAcceptAction(tx);
  input = checkActionParticipants(tx.exCaller, tx.verCaller);

  // Save the updated action
  const t = await getAssetRegistry('it.goscore.p1.assets.Action');
  await t.update(result.action);
  
  const r = await getAssetRegistry('it.goscore.p1.assets.Reward');
  
  if(input == 1){
    await r.update(result.action.executorReward);
  }
  else if(input == 2){
    await r.update(result.action.verifierReward);
  }
}

function fxAcceptAction(tx){
  // Checks if either one executor or one verifier has been specified
  result = checkActionParticipants(tx.exCaller, tx.verCaller);

  // An executor has been specified - Ok
  if(result == 1){

    // The caller must be the executor assigned to the action
    if(tx.exCaller !== tx.action.executor){
      throw new Error('Only the Executor assigned to this action is authorized to accept it');
    }
    
    tx.action.executorConfirmation = true;
    tx.action.executorReward.recipient = tx.action.executor.p;
  }

  // A verifier has been specified - Ok
  else {
    // The caller must be the verifier assigned to the action
    if(tx.verCaller !== tx.action.verifier){
      throw new Error('Only the Verifier assigned to this action is authorized to accept it');
    }
    
    tx.action.verifierConfirmation = true;
    tx.action.verifierReward.recipient = tx.action.verifier.p;
  }

  return tx;
}



/**
* An Executor reject the assigned action.
* @param {it.goscore.p1.transactions.RejectAction} tx The transaction instance.
* @transaction
*
* CdU_12
*
async function onRejectAction(tx){

  result = fxRejectAction(tx);

  // Save the updated action
  const t = await getAssetRegistry('it.goscore.p1.assets.Action');
  await t.update(result.action);
}

function fxRejectAction(tx){
  // Checks if either one executor or one verifier has been specified
  result = checkActionParticipants(tx.exCaller, tx.verCaller);

  // An executor has been specified - Ok
  if(result == 1){
    
    // The caller must be the executor assigned to the action
    if(tx.exCaller !== tx.action.executor){
      throw new Error('Only the Executor assigned to this action is authorized to reject it');
    }

    // Action already accepted can not be rejected
    if(tx.action.executorConfirmation == true){
      throw new Error('Actions already accepted cannot be refused');
    }

    tx.action.executor = null;
  }

  // A verifier has been specified - Ok
  else {
    // The caller must be the verifier assigned to the action
    if(tx.verCaller !== tx.action.verifier){
      throw new Error('Only the Verifier assigned to this action is authorized to reject it');
    }

    // Action already accepted can not be rejected
    if(tx.action.verifierConfirmation == true){
      throw new Error('Actions already accepted cannot be refused');
    }

    tx.action.verifier = null;
  }
  
  return tx;
}



/**
* An Executor executes the accepted action.
* @param {it.goscore.p1.transactions.ExecuteAction} tx The transaction instance.
* @transaction
*
* CdU_15
*
async function onExecuteAction(tx){
  
  result = fxExecuteAction(tx);
  
  // Save the updated action
  const t = await getAssetRegistry('it.goscore.p1.assets.Action');
  await t.update(result.action);
}

function fxExecuteAction(tx){
  // The action must be INITIALIZED
  if(tx.action.state !== "INITIALIZED"){
    throw new Error('Only initialized actions can be executed');
  }

  // The executor has beeen defined and he accepted to execute the action
  if((tx.action.executor == null) || (tx.action.executorConfirmation !== true)){
    throw new Error('The executor of this action is not defined yet');
  }
  
  // The caller must be the executor assigned to the action
  if(tx.caller !== tx.action.executor){
    throw new Error('Only the Executor of this action is authorized to execute it');
  }

  tx.action.hashExecutionDocuments = tx.hashExecutionDocuments;
  tx.action.executorTimestamp = tx.timestamp;
  
  // Attach hash of execution documents
  tx.action.state = 'EXECUTED';

  return tx;
}



/**
* The exCoordinator verifies the execution of an action.
* @param {it.goscore.p1.transactions.ExApproveAction} tx The transaction instance.
* @transaction
*
* CdU_16
*
async function onExApproveAction(tx){
  
  result = fxExApproveAction(tx);

  // Save the updated action
  const t = await getAssetRegistry('it.goscore.p1.assets.Action');
  await t.update(result.action);
}

function fxExApproveAction(tx){
  // The action must be EXECUTED
  if(tx.action.state !== "EXECUTED"){
    throw new Error('Only executed actions can be approved');
  }

  // The exCoordinator has been defined and he accepted to coordinate the task
  if(tx.action.exCoordinatorReward.recipient == null){
    throw new Error('The exCoordinator of this action is not defined yet');
  }

  // The caller must be the exCoordinator assigned to the action
  if(tx.caller.p !== tx.action.exCoordinatorReward.recipient){
    throw new Error('Only the exCoordinator of this action is authorized to approve it');
  }    
  
  // Decide whether the action has been executed or not
  if(tx.approvalResult){
    tx.action.state = 'EXAPPROVED';
  } else{
    tx.action.state = 'INITIALIZED';
  }
  
  // Attach hash of approval documents
  tx.action.hashExApprovalDocuments = tx.hashExApprovalDocuments;
  tx.action.exApprovalTimestamp = tx.timestamp;

  return tx;
}




/**
* A Verifier verifies the execution of an action.
* @param {it.goscore.p1.transactions.VerifyAction} tx The transaction instance.
* @transaction
*
* CdU_17
*
async function onVerifyAction(tx){

  result = fxVerifyAction(tx);

  // Save the updated action
  const t = await getAssetRegistry('it.goscore.p1.assets.Action');
  await t.update(result.action);
}

function fxVerifyAction(tx){
  // The action must be EXAPPROVED
  if(tx.action.state !== "EXAPPROVED"){
    throw new Error('Only actions approved by the ExCoordinator can be verified');
  }

  // The verifier has been defined and he accepted to verify the action
  if((tx.action.verifier == null) || (tx.action.verifierConfirmation !== true)){
    throw new Error('The verifier of this action is not defined yet');
  }

  // The caller must be the verifier assigned to the action
  if(tx.caller !== tx.action.verifier){
    throw new Error('Only the Verifier of this action is authorized to verify it');
  }    
  
  // Decide whether the action has been correctly executed or not
  if(tx.approvalResult){
    tx.action.state = 'VERIFIED';
  } else{
    tx.action.state = 'EXECUTED';
  }
  
  // Attach hash of verification documents
  tx.action.hashVerificationDocuments = tx.hashVerificationDocuments;
  tx.action.verifierTimestamp = tx.timestamp;

  return tx;
}


/**
* The verCoordinator verifies the verification of an action.
* @param {it.goscore.p1.transactions.VerApproveAction} tx The transaction instance.
* @transaction
*
* CdU_18
*
async function onVerApproveAction(tx){
  
  result = fxVerApproveAction(tx);

  // Save the updated action
  const t = await getAssetRegistry('it.goscore.p1.assets.Action');
  await t.update(result.action);
}

function fxVerApproveAction(tx){
  // The action must be VERIFIED
  if(tx.action.state !== "VERIFIED"){
    throw new Error('Only verified actions can be approved by the VerCoordinator');
  }

  // The verCoordinator has been defined and he accepted to coordinate the task
  if(tx.action.verCoordinatorReward.recipient == null){
    throw new Error('The verCoordinator of this action is not defined yet');
  }

  // The caller must be the verCoordinator assigned to the action
  if(tx.caller.p !== tx.action.verCoordinatorReward.recipient){
    throw new Error('Only the verCoordinator of this action is authorized to approve it');
  }    
  
  // Decide whether the action has been executed or not
  if(tx.approvalResult){
    if(tx.action.parentTask.inspectorRequired == false){
      // 1) The action is approved and there is no inspector
      tx.action.state = 'INSPECTED';
    }
    else{
      // 2) The action is approved and there is an inspector
      tx.action.state = 'VERAPPROVED';
    }
  } 
  else{
    if(tx.action.deleteAction == false){
      // 3) The action is not approved and there is no critical error
      tx.action.state = 'EXAPPROVED';
    }
    else{
      if(tx.action.parentTask.inspectorRequired == false){
        // 4) The action is not approved, there is a critical error and there is no inspector
        tx.action.state = 'SUSPENDED_VERCOORDINATOR';
      }
      else{
        // 5) The action is not approved, there is a critical error and there is an inspector
        tx.action.state = 'INSPECTED';
      }
    }
  }
  
  // Attach hash of approval documents
  tx.action.hashVerApprovalDocuments = tx.hashVerApprovalDocuments;
  tx.action.verApprovalTimestamp = tx.timestamp;

  return tx;
}



/**
* An inspector verifies the verification of an action.
* @param {it.goscore.p1.transactions.InspectAction} tx The transaction instance.
* @transaction
*
* CdU_19
*
async function onInspectAction(tx){

  result = fxInspectAction(tx);

  // Save the updated action
  const t = await getAssetRegistry('it.goscore.p1.assets.Action');
  await t.update(result.action);
}

function fxInspectAction(tx){
  // The action must be VERAPPROVED
  if(tx.action.state !== "VERAPPROVED"){
    throw new Error('Only actions approved by the VerCoordinator can be inspected');
  }

  // Only actions of task requiring an inspector can be inspected
  if(! tx.action.parentTask.inspectorRequired){
    throw new Error('The current task does not require an Inspector');
  }

  // The inspector has been defined and he accepted to coordinate the task
  if(tx.action.inspectorReward.recipient == null){
    throw new Error('The inspector of this action is not defined yet');
  }
  
  // The caller must be the inspector assigned to the task
  if(tx.caller.p !== tx.action.inspectorReward.recipient){
    throw new Error('Only the inspector of this action is authorized to verify it');
  }    
  
  // Decide whether the verification has been correctly executed or not
  if(tx.approvalResult){
    // 1) The action is approved
    tx.action.state = 'INSPECTED';
  } else{
    if(tx.action.deleteAction == false){
      // 2) The action is not approved and there is no critical error
      tx.action.state = 'VERIFIED';
    }
    else{
      // 3) The action is not approved and there is a critical error
      tx.action.state = 'SUSPENDED_INSPECTOR';
    }
  }
  
  // Attach hash of inspection documents
  tx.action.hashInspectionDocuments = tx.hashInspectionDocuments;
  tx.action.inspectorTimestamp = tx.timestamp;

  return tx;
}



/**
* A Producer either restores or cancels an action.
* @param {it.goscore.p1.transactions.RestoreAction} tx The transaction instance.
* @transaction
*
* CdU_18, CdU_19
*
async function onRestoreAction(tx){
  
  result = fxRestoreAction(tx);

  // Save the updated action
  const t = await getAssetRegistry('it.goscore.p1.assets.Action');
  await t.update(result.action);
}

function fxRestoreAction(tx){
  // The action must be suspended
  if((tx.action.state !== "SUSPENDED_VERCOORDINATOR") && (tx.action.state !== "SUSPENDED_INSPECTOR")){
    throw new Error('Only suspended actions can be approved by restored');
  }

  // The caller must be the producer of the action
  if(tx.caller !== tx.action.producer){
    throw new Error('Only the Producer of this action is authorized to edit it');
  }

  if(tx.choice){
    if(tx.action.state == "SUSPENDED_VERCOORDINATOR"){
      // 1) The producer restores the action that was suspended by the VerCoordinator, so he must choose a different option
      tx.action.state = "VERIFIED";
    }
    else if(tx.action.state == "SUSPENDED_INSPECTOR"){
      // 2) The producer restores the action that was suspended by the Inspector, so he must choose a different option
      tx.action.state = "VERAPPROVED";
    } 
  }
  else{
    // 3) The producer cancels the action
    tx.task.state = "CANCELED";
  }

  return tx;
}



/**
* A Producer submits an action.
* @param {it.goscore.p1.transactions.SubmitAction} tx The transaction instance.
* @transaction
*
* CdU_20
*
async function onSubmitAction(tx){
  
  result = fxSubmitAction(tx);

  // Save the updated action
  const t = await getAssetRegistry('it.goscore.p1.assets.Action');
  await t.update(result.action);
}

function fxSubmitAction(tx){
  // The action must be INSPECTED
  if(tx.action.state !== "INSPECTED"){
    throw new Error('Only inspected actions can be submitted');
  }

  // The caller must be the producer assigned to the action
  if(tx.caller !== tx.action.parentTask.producer){
    throw new Error('Only the Producer of this action is authorized to submit it');
  }

  // Update action's state
  tx.action.state = 'SUBMITTED';
  
  return tx;
}



/**
* A Producer reviews an action based on the review of the task provided by the customer.
* @param {it.goscore.p1.transactions.ReviewAction} tx The transaction instance.
* @transaction
*
* CdU_23
*
async function onReviewAction(tx){
  
  result = fxReviewAction(tx);

  // Save the updated action
  const t = await getAssetRegistry('it.goscore.p1.assets.Action');
  await t.update(result.action);
}

function fxReviewAction(tx){
  // The action must be SUBMITTED
  if(tx.action.state !== "SUBMITTED"){
    throw new Error('Only submitted actions can be reviewed');
  }

  // The parent task must be reviewed by the Customer
  if(tx.action.parentTask.state !== "SUBMITTED"){
    throw new Error('Only actions belonging to a submitted task can be reviewed');
  }

  // The caller must be the producer assigned to the action
  if(tx.caller !== tx.action.parentTask.producer){
    throw new Error('Only the Producer of this action is authorized to review it');
  }

  if(tx.approvalResult){
    if(tx.CompleteAction){
      // 1) The action is approved by the producer and does not need any further review
      tx.action.state = "COMPLETE";
    } else {
      // 2) The action is approved by the producer but it may need further reviews
      tx.action.state = "SUBMITTED";
    }
  }
  else {
    // 3) The action is not approved by the producer
    tx.action.state = "EXECUTED";
  }

  return tx;
}


/**
* A Producer pays executor and verifier for an action.
* @param {it.goscore.p1.transactions.PayAction} tx The transaction instance.
* @transaction
*
* CdU_24
*
async function onPayAction(tx){

  result = fxPayAction(tx);
  
  // Save the updated action
  const t = await getAssetRegistry('it.goscore.p1.assets.Action');
  await t.update(result.action);
}

function fxPayAction(tx){
  // The caller must be the producer assigned to the action
  if(tx.caller !== tx.action.parentTask.producer){
    throw new Error('Only the Producer of this action is authorized to pay for its execution');
  }
  
  // The caller must specify the hash
  if(tx.hashPayment == null){
    throw new Error('The hash of the payment must be specified');
  }

  // Checks if either an executor or a verifier has been specified
  result = checkActionParticipants(tx.exReceiver, tx.verReceiver);

  // An executor has been specified - Ok
  if(result == 1){
    if (tx.action.hashPaymentExecutor == null){
      tx.action.hashPaymentExecutor = [];
    }
    tx.action.hashPaymentExecutor.push(tx.hashPayment);
  }

  // A verifier has been specified - Ok
  else {
    if (tx.action.hashPaymentVerifier == null){
      tx.action.hashPaymentVerifier = [];
    }
    tx.action.hashPaymentVerifier.push(tx.hashPayment);
  }

  tx.action.state = 'PAID';

  return tx;
}



/**
* A Producer states that an action is complete.
* @param {it.goscore.p1.transactions.CompleteAction} tx The transaction instance.
* @transaction
*
* CdU_26
*
async function onCompleteAction(tx){
  
  result = fxCompleteAction(tx);
  
  // Save the updated action
  const t = await getAssetRegistry('it.goscore.p1.assets.Action');
  await t.update(result.action);
}

function fxCompleteAction(tx){
  // The caller must be the producer assigned to the action
  if(tx.caller !== tx.action.parentTask.producer){
    throw new Error('Only the Producer of this action is authorized to complete it');
  }
  
  tx.action.state = 'COMPLETED';

  return tx;
}



/**
* A Producer substitutes a Executor.
* @param {it.goscore.p1.transactions.SubstituteExecutor} tx The transaction instance.
* @transaction
*
* CdU_39
*
async function onSubstituteExecutor(tx){
  
  result = fxSubstituteExecutor(tx);
  
  // Save the updated action
  const t = await getAssetRegistry('it.goscore.p1.assets.Action');
  await t.update(result.action);

  // Save the updated reward
  const r = await getAssetRegistry('it.goscore.p1.assets.Reward');
  await r.update(result.action.executorReward);
}

function fxSubstituteExecutor(tx){
  // The caller must be the producer assigned to the action
  if(tx.caller !== tx.action.parentTask.producer){
    throw new Error('Only the Producer of this action is authorized to edit it');
  }
  
  tx.action.executor = tx.executor;
  tx.action.executorReward.recipient = tx.executor.p;

  return tx;
}



/**
 * Given the input parameters of a function in which the user must
 * specify either an executor or a verifier, it checks if one and 
 * only one of the parameters has been specified. It either returns 
 * '1' (executor) or returns '2' (verifier) or throws an Error. 
 * 
 * @param {*} executor The executor parameter received by the original caller
 * @param {*} verifier The verifier parameter received by the original caller
 *
function checkActionParticipants(executor, verifier){

  // Case 1: Neither an executor nor a verifier has been specified - Error
  if(executor == null && verifier == null){
    throw new Error('Either an executor or a verifier must be specified');
  }

  // Case 2: An executor and also a verifier have been specified - Error
  else if(executor != null && verifier != null){
    throw new Error('Only an executor or a verifier must be specified');
  }

  // Case 3: An executor has been specified - Ok
  else if(executor != null){
    return 1;
  }

  // Case 4: A verifier has been specified - Ok
  else {
    return 2;
  }
}



/**
 * Given the input parameters of a function in which the user must
 * specify either an executor or a verifier or a coordinator, it 
 * checks if one and only one of the parameters has been specified. 
 * It returns '1' (executor), '2' (verifier), '3' (exCoordinator), 
 * '4' (verCoordinator) or throws an Error. 
 * 
 * @param {*} executor The executor parameter received by the original caller
 * @param {*} verifier The verifier parameter received by the original caller
 * @param {*} exCoordinator The exCoordinator parameter received by the original caller
 * @param {*} verCoordinator The verCoordinator parameter received by the original caller
 *
function checkActionParticipants(executor, verifier, exCoordinator, verCoordinator){

  counter = 0;

  if(executor != null) counter++;
  if(verifier != null) counter++;
  if(exCoordinator != null) counter++;
  if(verCoordinator != null) counter++;

  // Case 1: Only one actor must be specified - Error
  if(counter != 1){
    throw new Error('One and only one actor (executor, verifier, exCoordinator, verCoordinator) must be specified');
  }

  if(executor != null) return 1;       // Case 2: An executor has been specified - Ok
  if(verifier != null) return 2;       // Case 3: A verifier has been specified - Ok
  if(exCoordinator != null) return 3;  // Case 4: An exCoordinator has been specified - Ok
  if(verCoordinator != null) return 4; // Case 5: A verCoordinator has been specified - Ok
}

*/