/**
 * Initialize a campaign by adding coupons
 * @param {eu.sardcoin.transactions.AddCoupons} tx The transaction instance.
 * @transaction
 * 
 * CdU_***
 */
async function onAddCoupons(tx){
/*
  // The caller must be the producer of the campaign
  if (getCurrentParticipant().getFullyQualifiedIdentifier() !== tx.campaign.producer.getFullyQualifiedIdentifier()) {
    throw new Error('Only the Producer of this campaign is authorized to add coupons to it');
  }
*/
  // The campaign must be in the CREATED state
  if(tx.campaign.state !== 'CREATED'){
    throw new Error('Only CREATED campaign can be create coupons');
  }

  // The campaign must be created less than "delay" hours ago
  var editDeadline = getDateWithDelay(tx.campaign.creationTime, tx.campaign.delay);
  if(tx.timestamp >= editDeadline){
    throw new Error('The deadline for creating campaign coupons is expired');
  }

  const factory = getFactory();
  const AP = 'eu.sardcoin.assets';
  const couponsRegistry = await getAssetRegistry(AP + '.Coupon');
  const campaignRegistry = await getAssetRegistry(AP + '.Campaign');

  // Create coupons
  coupons = []
  for(i=0; i<tx.tokens.length; i++){
    coupon = factory.newResource(AP, 'Coupon', tx.tokens[i]);
    coupon.state = 'CREATED';
    coupon.campaign = factory.newRelationship(AP, 'Campaign', tx.campaign.campaignId);
    coupons.push(coupon);
  }
  
  // Update coupons registry
  await couponsRegistry.addAll(coupons);

  // Update campaign registry
  tx.campaign.coupons = coupons;
  tx.campaign.state = 'INITIALIZED';
  campaignRegistry.update(tx.campaign);
}



/**
 * The deadline for editing a campaign is expired, the campaign is now available
 * @param {eu.sardcoin.transactions.PublishCampaign} tx The transaction instance.
 * @transaction
 * 
 * CdU_5
 */
async function onPublishCampaign(tx){

  // The campaign must be in the INITIALIZED state
  if(tx.campaign.state !== 'INITIALIZED'){
    throw new Error('Only INITIALIZED campaigns can be published');
  }

  // The campaign must be created less than "delay" hours ago
  var editDeadline = getDateWithDelay(tx.campaign.creationTime, tx.campaign.delay);
  if(tx.timestamp < editDeadline){
    throw new Error('Edit deadline not expired yet');
  }

  if(typeof tx.campaign.coupons !== 'undefined' && tx.campaign.coupons.length > 0){
    tx.campaign.state = 'AVAILABLE';

    for(i=0; i<tx.campaign.coupons.length; i++){
      tx.campaign.coupons[i].state = 'AVAILABLE';
    }

    // Save the updated coupons
    const a = await getAssetRegistry('eu.sardcoin.assets.Coupon');
    await a.updateAll(tx.campaign.coupons);

    // Save the updated campaign
    const b = await getAssetRegistry('eu.sardcoin.assets.Campaign');
    await b.update(tx.campaign);

  } else {
    throw new Error('Campaign must contain at least one coupon in order to be published');
  }
}



/**
 * A producer deletes a campaign
 * @param {eu.sardcoin.transactions.DeleteCampaign} tx The transaction instance.
 * @transaction
 * 
 * CdU_6
 */
async function onDeleteCampaign(tx){
/*
  // The caller must be the producer of the campaign
  if (getCurrentParticipant().getFullyQualifiedIdentifier() !== tx.campaign.producer.getFullyQualifiedIdentifier()) {
    throw new Error('Only the Producer of this campaign is authorized to delete it');
  }
*/

  // The campaign must be in the CREATED state and must be created less "delay" hours ago
  var editDeadline = getDateWithDelay(tx.campaign.creationTime, tx.campaign.delay);
  if((tx.timestamp > editDeadline) || ((tx.campaign.state !== 'CREATED') && (tx.campaign.state !== 'INITIALIZED'))){
    throw new Error('Delete deadline expired');
  }

  // The campaign is now CANCELED
  tx.campaign.state = 'CANCELED';

  if(typeof tx.campaign.coupons !== 'undefined' && tx.campaign.coupons.length > 0){
    for(i=0; i<tx.campaign.coupons.length; i++){
      tx.campaign.coupons[i].state = 'CANCELED';
    }

    // Save the updated coupons
    const a = await getAssetRegistry('eu.sardcoin.assets.Coupon');
    await a.updateAll(tx.campaign.coupons);
  }


  // Save the updated campaign
  const b = await getAssetRegistry('eu.sardcoin.assets.Campaign');
  await b.update(tx.campaign);
}



/**
 * A producer edits a campaign
 * @param {eu.sardcoin.transactions.EditCampaign} tx The transaction instance.
 * @transaction
 * 
 * CdU_6
 */
async function onEditCampaign(tx){
/*
  // The caller must be the producer of the campaign
  if (getCurrentParticipant().getFullyQualifiedIdentifier() !== tx.campaign.producer.getFullyQualifiedIdentifier()) {
    throw new Error('Only the Producer of this campaign is authorized to edit it');
  }
*/
  // The campaign must be in the CREATED state and must be created less "delay" hours ago
  var editDeadline = getDateWithDelay(tx.campaign.creationTime, tx.campaign.delay);
  if((tx.timestamp > editDeadline) || ((tx.campaign.state !== 'CREATED') && (tx.campaign.state !== 'INITIALIZED'))){
    throw new Error('Edit deadline expired');
  }

  // Replace old attributes with new values
  if(tx.title != null)
    tx.campaign.title = tx.title;
  
  if(tx.price != null)
    tx.campaign.price = tx.price;

  if(tx.economicValue != null)
    tx.campaign.economicValue = tx.economicValue;

  if(tx.expirationTime != null)
    tx.campaign.expirationTime = tx.expirationTime;

  if(tx.dateConstraints != null)
    tx.campaign.dateConstraints = tx.dateConstraints;

  if(tx.verifiers != null)
    tx.campaign.verifiers = tx.verifiers;

  // Save the updated campaign
  const b = await getAssetRegistry('eu.sardcoin.assets.Campaign');
  await b.update(tx.campaign);
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
/*  tx.coupon.consumer = getCurrentParticipant(); */
  tx.coupon.consumer = tx.caller;

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
/*
  // The caller must be the consumer of the coupon
  if (getCurrentParticipant().getFullyQualifiedIdentifier() !== tx.coupon.consumer.getFullyQualifiedIdentifier()) {
    throw new Error('Only the consumer that bought this coupon is authorized to redeem it');
  }
*/
  // The coupon must be in the BOUGHT state
  if(tx.coupon.state !== 'BOUGHT'){
    throw new Error('Only bought coupons can be redempt');
  }

  // The deadline for redeeming the coupon must not be expired yet
  if((tx.coupon.expirationTime != null) && (tx.timestamp > tx.coupon.expirationTime)){
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
/*
  // The caller must be one of the verifiers of the coupon
  i=0;
  found = false;
  do{

    if(tx.coupon.verifiers[i].getFullyQualifiedIdentifier() === getCurrentParticipant().getFullyQualifiedIdentifier()){
*/      // The coupon is now redeemed
      if(tx.result)
        tx.coupon.state = 'REDEEMED';
      else
        tx.coupon.state = 'BOUGHT';

//      found = true;

      // Save the updated coupon
      const a = await getAssetRegistry('eu.sardcoin.assets.Coupon');
      await a.update(tx.coupon);
/*    }

    i++;

  } while((i<tx.coupon.verifiers.length) && (found == false));

  if(found == false)
    throw new Error('Only one of the verifiers associated to the coupon are authorized to redeem it');
*/}

function getDateWithDelay(time, delay){
  return new Date(time.getTime() + (60*60*1000*Math.abs(delay)));
}