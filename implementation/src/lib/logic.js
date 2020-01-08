/**
 * The deadline for editing a coupon is expired, the coupon is now available
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
 * A producer deletes a coupon
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
 * CdU_3b
 */
async function onEditCoupon(tx){

  result = fxEditCoupon(tx);

  // Save the updated coupon
  const a = await getAssetRegistry('eu.sardcoin.assets.Coupon');
  await a.update(result.coupon);
}

function fxEditCoupon(tx){
  // The caller must be the producer of the coupon
  if(tx.caller !== tx.coupon.producer){
    throw new Error('Only the Producer of this coupon is authorized to edit it');
  }

  // The coupon must be in the CREATED state and the must be created less than 24h ago
  var editDeadline = new Date(tx.coupon.creationTime.getTime() + (60*60*1000*24));
  if((tx.timestamp > editDeadline) || (tx.coupon.state !== 'CREATED')){
    throw new Error('Edit deadline expired');
  }

  // Replace old attributes with new values
  if(tx.title !== null)
    tx.coupon.title = tx.title;
  
  if(tx.price !== null)
    tx.coupon.price = tx.price;

  if(tx.economicValue !== null)
    tx.coupon.economicValue = tx.economicValue;

  if(tx.expirationTime !== null)
    tx.coupon.expirationTime = tx.expirationTime;

  if(tx.dateConstraints !== null)
    tx.coupon.dateConstraints = tx.dateConstraints;

  if(tx.placeConstraints !== null)
    tx.coupon.placeConstraints = tx.placeConstraints;

  if(tx.verifiers !== null)
    tx.coupon.verifiers = tx.verifiers;

  return tx;
}



/**
 * A consumer buys a coupon
 * @param {eu.sardcoin.transactions.BuyCoupon} tx The transaction instance.
 * @transaction
 * 
 * CdU_5
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
  tx.coupon.consumer = tx.caller;

  return tx;
}



/**
 * The deadline for redeeming a coupon is expired
 * @param {eu.sardcoin.transactions.RedemptionDeadlineExpired} tx The transaction instance.
 * @transaction
 * 
 * CdU_7a
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

  // The coupon must be expired
  if(tx.timestamp < tx.coupon.expirationTime){
    throw new Error('Redemption deadline not expired yet');
  }

  tx.coupon.state = 'EXPIRED';
}



/**
 * A consumer request to redeem a coupon
 * @param {eu.sardcoin.transactions.CouponRedemptionRequest} tx The transaction instance.
 * @transaction
 * 
 * CdU_7
 */
async function onCouponRedemptionRequest(tx){

  result = fxCouponRedemptionRequest(tx);

  // Save the updated coupon
  const a = await getAssetRegistry('eu.sardcoin.assets.Coupon');
  await a.update(result.coupon);
}

function fxCouponRedemptionRequest(tx){

  // The caller must be the consumer of the coupon
  if(tx.caller !== tx.coupon.consumer){
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