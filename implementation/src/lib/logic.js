/**
 * The deadline for editing a coupon is expired, the coupon is now available
 * @param {eu.sardcoin.transactions.PublishCoupon} tx The transaction instance.
 * @transaction
 * 
 * CdU_5
 */
async function onPublishCoupon(tx){

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

  // Save the updated coupon
  const a = await getAssetRegistry('eu.sardcoin.assets.Coupon');
  await a.update(tx.coupon);
}



/**
 * A producer deletes a coupon
 * @param {eu.sardcoin.transactions.DeleteCoupon} tx The transaction instance.
 * @transaction
 * 
 * CdU_6
 */
async function onDeleteCoupon(tx){

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

  // Save the updated coupon
  const a = await getAssetRegistry('eu.sardcoin.assets.Coupon');
  await a.update(tx.coupon);
}



/**
 * A producer edits a coupon
 * @param {eu.sardcoin.transactions.EditCoupon} tx The transaction instance.
 * @transaction
 * 
 * CdU_6
 */
async function onEditCoupon(tx){

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

  // Save the updated coupon
  const a = await getAssetRegistry('eu.sardcoin.assets.Coupon');
  await a.update(tx.coupon);
}



/**
 * A consumer buys a coupon
 * @param {eu.sardcoin.transactions.BuyCoupon} tx The transaction instance.
 * @transaction
 * 
 * CdU_8
 */
async function onBuyCoupon(tx){

  // The coupon must be in the AVAILABLE state
  if(tx.coupon.state !== 'AVAILABLE'){
    throw new Error('Only available coupons can be bought');
  }

  // The coupon is now bought
  tx.coupon.state = 'BOUGHT';
  tx.coupon.consumer = tx.getCurrentParticipant();

  // Save the updated coupon
  const a = await getAssetRegistry('eu.sardcoin.assets.Coupon');
  await a.update(tx.coupon);
}



/**
 * The deadline for redeeming a coupon is expired
 * @param {eu.sardcoin.transactions.RedemptionDeadlineExpired} tx The transaction instance.
 * @transaction
 * 
 * CdU_10
 */
async function onRedemptionDeadlineExpired(tx){

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

  // Save the updated coupon
  const a = await getAssetRegistry('eu.sardcoin.assets.Coupon');
  await a.update(tx.coupon);
}



/**
 * A consumer request to redeem a coupon
 * @param {eu.sardcoin.transactions.CouponRedemptionRequest} tx The transaction instance.
 * @transaction
 * 
 * CdU_11
 */
async function onCouponRedemptionRequest(tx){

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

  // Save the updated coupon
  const a = await getAssetRegistry('eu.sardcoin.assets.Coupon');
  await a.update(tx.coupon);
}



/**
 * A verifier either approves or denies the request to redeem a coupon
 * @param {eu.sardcoin.transactions.CouponRedemptionApproval} tx The transaction instance.
 * @transaction
 * 
 * CdU_11
 */
async function onCouponRedemptionApproval(tx){

  // The coupon must be in the AWAITING state
  if(tx.coupon.state !== 'AWAITING'){
    throw new Error('Only awaiting coupons can be approved (or denied)');
  }

  // The caller must be one of the verifiers of the coupon
  i=0;
  found = false;
  do{

    if(tx.coupon.verifiers[i].getFullyQualifiedIdentifier() === tx.getCurrentParticipant().getFullyQualifiedIdentifier()){
      // The coupon is now redeemed
      if(tx.result)
        tx.coupon.state = 'REDEEMED';
      else
        tx.coupon.state = 'BOUGHT';

      found = true;

      // Save the updated coupon
      const a = await getAssetRegistry('eu.sardcoin.assets.Coupon');
      await a.update(tx.coupon);
    }

    i++;

  } while((i<tx.coupon.verifiers.length) && (found == false));

  if(found == false)
    throw new Error('Only one of the verifiers associated to the coupon are authorized to redeem it');
}
