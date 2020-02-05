/**
 * The deadline for editing a coupon is expired, the coupon is now available
 * @param {eu.sardcoin.transactions.PublishCoupon} tx The transaction instance.
 * @transaction
 * 
 * CdU_5
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

  return tx;
}



/**
 * A producer deletes a coupon
 * @param {eu.sardcoin.transactions.DeleteCoupon} tx The transaction instance.
 * @transaction
 * 
 * CdU_6
 */
async function onDeleteCoupon(tx){

  result = fxDeleteCoupon(tx);

  // Save the updated coupon
  const a = await getAssetRegistry('eu.sardcoin.assets.Coupon');
  await a.update(result.coupon);
}

function fxDeleteCoupon(tx){
  // The caller must be the producer of the coupon
  if (getCurrentParticipant().getFullyQualifiedIdentifier() !== tx.coupon.producer.getFullyQualifiedIdentifier()) {
    throw new Error('Only the Producer of this coupon is authorized to delete it');
  }

  // The coupon must be in the CREATED state and the must be created less than 24h ago
  var editDeadline = new Date(tx.coupon.creationTime.getTime() + (60*60*1000*24));
  if((tx.timestamp > editDeadline) || (tx.coupon.state !== 'CREATED')){
    throw new Error('Delete deadline expired');
  }

  // The coupon is now CANCELED
  tx.coupon.state = 'CANCELED';

  return tx;
}



/**
 * A producer edits a coupon
 * @param {eu.sardcoin.transactions.EditCoupon} tx The transaction instance.
 * @transaction
 * 
 * CdU_6
 */
async function onEditCoupon(tx){

  result = fxEditCoupon(tx);

  // Save the updated coupon
  const a = await getAssetRegistry('eu.sardcoin.assets.Coupon');
  await a.update(result.coupon);
}

function fxEditCoupon(tx){
  // The caller must be the producer of the coupon
  if (getCurrentParticipant().getFullyQualifiedIdentifier() !== tx.coupon.producer.getFullyQualifiedIdentifier()) {
    throw new Error('Only the Producer of this coupon is authorized to edit it');
  }

  // The coupon must be in the CREATED state and the must be created less than 24h ago
  var editDeadline = new Date(tx.coupon.creationTime.getTime() + (60*60*1000*24));
  if((tx.timestamp > editDeadline) || (tx.coupon.state !== 'CREATED')){
    throw new Error('Edit deadline expired');
  }

  // Replace old attributes with new values
  if(tx.title != null)
    tx.coupon.title = tx.title;
  
  if(tx.price != null)
    tx.coupon.price = tx.price;

  if(tx.economicValue != null)
    tx.coupon.economicValue = tx.economicValue;

  if(tx.expirationTime != null)
    tx.coupon.expirationTime = tx.expirationTime;

  if(tx.dateConstraints != null)
    tx.coupon.dateConstraints = tx.dateConstraints;

  if(tx.verifiers != null)
    tx.coupon.verifiers = tx.verifiers;

  return tx;
}



/**
 * A consumer buys a coupon
 * @param {eu.sardcoin.transactions.BuyCoupon} tx The transaction instance.
 * @transaction
 * 
 * CdU_8
 */
async function onBuyCoupon(tx){

  result = fxBuyCoupon(tx);

  // Save the updated coupon
  const a = await getAssetRegistry('eu.sardcoin.assets.Coupon');
  await a.update(result.coupon);
}

function fxBuyCoupon(tx){

  // The coupon must be in the AVAILABLE state
  if(tx.coupon.state !== 'AVAILABLE'){
    throw new Error('Only available coupons can be bought');
  }

  // The coupon is now bought
  tx.coupon.state = 'BOUGHT';
  tx.coupon.consumer = tx.getCurrentParticipant();

  return tx;
}



/**
 * The deadline for redeeming a coupon is expired
 * @param {eu.sardcoin.transactions.RedemptionDeadlineExpired} tx The transaction instance.
 * @transaction
 * 
 * CdU_10
 */
async function onRedemptionDeadlineExpired(tx){

  result = fxRedemptionDeadlineExpired(tx);

  // Save the updated coupon
  const a = await getAssetRegistry('eu.sardcoin.assets.Coupon');
  await a.update(result.coupon);
}

function fxRedemptionDeadlineExpired(tx){
  // Only coupons neither expired nor canceled can expire
  if((tx.coupon.state === 'CANCELED') || (tx.coupon.state === 'EXPIRED')){
    throw new Error('Only coupons neither expired nor canceled can expire');
  }

  // There is no expiration deadline
  if(tx.coupon.expirationTime == null){
    throw new Error('There is no expiration deadline');
  }

  // The coupon must be expired
  if(tx.timestamp < tx.coupon.expirationTime){
    throw new Error('Redemption deadline not expired yet');
  }

  tx.coupon.state = 'EXPIRED';

  return tx;
}



/**
 * A consumer request to redeem a coupon
 * @param {eu.sardcoin.transactions.CouponRedemptionRequest} tx The transaction instance.
 * @transaction
 * 
 * CdU_11
 */
async function onCouponRedemptionRequest(tx){

  result = fxCouponRedemptionRequest(tx);

  // Save the updated coupon
  const a = await getAssetRegistry('eu.sardcoin.assets.Coupon');
  await a.update(result.coupon);
}

function fxCouponRedemptionRequest(tx){

  // The caller must be the consumer of the coupon
  if (getCurrentParticipant().getFullyQualifiedIdentifier() !== tx.coupon.consumer.getFullyQualifiedIdentifier()) {
    throw new Error('Only the consumer that bought this coupon is authorized to redeem it');
  }

  // The coupon must be in the BOUGHT state
  if(tx.coupon.state !== 'BOUGHT'){
    throw new Error('Only bought coupons can be redempt');
  }

  // The deadline for redeeming the coupon must not be expired yet
  if((tx.coupon.expirationTime !== null) && (tx.timestamp > tx.coupon.expirationTime)){
    throw new Error('The deadline for redeeming the coupon is expired');
  }

  // The coupon is now awaiting
  tx.coupon.state = 'AWAITING';

  return tx;
}



/**
 * A verifier either approves or denies the request to redeem a coupon
 * @param {eu.sardcoin.transactions.CouponRedemptionApproval} tx The transaction instance.
 * @transaction
 * 
 * CdU_11
 */
async function onCouponRedemptionApproval(tx){

  result = fxCouponRedemptionApproval(tx);

  // Save the updated coupon
  const a = await getAssetRegistry('eu.sardcoin.assets.Coupon');
  await a.update(result.coupon);
}

function fxCouponRedemptionApproval(tx){
  // The coupon must be in the AWAITING state
  if(tx.coupon.state !== 'AWAITING'){
    throw new Error('Only awaiting coupons can be approved (or denied)');
  }

  // The caller must be one of the verifiers of the coupon
  for(i=0; i<tx.coupon.verifiers.length; i++){

    if(tx.coupon.verifiers[i].getFullyQualifiedIdentifier() === tx.getCurrentParticipant().getFullyQualifiedIdentifier()){
      // The coupon is now redeemed
      if(tx.result)
        tx.coupon.state = 'REDEEMED';
      else
        tx.coupon.state = 'BOUGHT';

      return tx;
    }
  }

  throw new Error('Only one of the verifiers associated to the coupon is authorized to redeem it');
}
