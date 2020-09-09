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
      throw new Error('Only CREATED campaigns can receive new coupons');
    }
  
    // The campaign must be created less than "delay" minutes ago
    if(isCampaignPublic(tx.campaign, tx.timestamp)){
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
  
    // The campaign must be either in the CREATED or INITIALIZED state and must be created less "delay" minutes ago
    if(isCampaignPublic(tx.campaign, tx.timestamp) || ((tx.campaign.state !== 'CREATED') && (tx.campaign.state !== 'INITIALIZED'))){
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
    // The campaign must be either in the CREATED or INITIALIZED state and must be created less "delay" minutes ago
    if(isCampaignPublic(tx.campaign, tx.timestamp) || ((tx.campaign.state !== 'CREATED') && (tx.campaign.state !== 'INITIALIZED'))){
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
  
    // The campaign must be created more than "delay" minutes ago
    if(!isCampaignPublic(tx.coupon.campaign, tx.timestamp)){
      throw new Error('Only coupons of a published campaign can be bought')
    }
    
    // The coupon must be in the CREATED state
    if(tx.coupon.state !== 'CREATED'){
      throw new Error('Only created coupons can be bought');
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
  
  
  
  /**
   * Add verifiers to a campaign
   * @param {eu.sardcoin.transactions.AddVerifiers} tx The transaction instance.
   * @transaction
   * 
   * CdU_***
   */
  async function onAddVerifiers(tx){
    /*
      // The caller must be the producer of the campaign
      if (getCurrentParticipant().getFullyQualifiedIdentifier() !== tx.campaign.producer.getFullyQualifiedIdentifier()) {
        throw new Error('Only the Producer of this campaign is authorized to add verifiers to it');
      }
    */
      const AP = 'eu.sardcoin.assets';
      const campaignRegistry = await getAssetRegistry(AP + '.Campaign');
    
      // Add verifiers
      for(i=0; i<tx.verifiers.length; i++){
        tx.campaign.verifiers.push(tx.verifiers[i]);
      }
    
      // Update campaign registry
      await campaignRegistry.update(tx.campaign);
    }



  /**
   * Add brokres to a campaign
   * @param {eu.sardcoin.transactions.AddBrokers} tx The transaction instance.
   * @transaction
   * 
   * CdU_***
   */
  async function onAddBrokers(tx){
    /*
      // The caller must be the producer of the campaign
      if (getCurrentParticipant().getFullyQualifiedIdentifier() !== tx.campaign.producer.getFullyQualifiedIdentifier()) {
        throw new Error('Only the Producer of this campaign is authorized to add brokers to it');
      }
    */
      const AP = 'eu.sardcoin.assets';
      const campaignRegistry = await getAssetRegistry(AP + '.Campaign');
    
      // Add brokers
      if(typeof tx.campaign.brokers === 'undefined'){
        tx.campaign.brokers = []
      }
      for(i=0; i<tx.brokers.length; i++){
        tx.campaign.brokers.push(tx.brokers[i]);
      }
    
      // Update campaign registry
      await campaignRegistry.update(tx.campaign);
    }



/**
 * Initialize a package by adding coupons
 * @param {eu.sardcoin.transactions.InitPackage} tx The transaction instance.
 * @transaction
 * 
 * CdU_***
 */
async function onInitPackage(tx){
  /*
    // The caller must be the broker of the package
    if (getCurrentParticipant().getFullyQualifiedIdentifier() !== tx.package.broker.getFullyQualifiedIdentifier()) {
      throw new Error('Only the Broker of this package is authorized to add coupons to it');
    }
  */

    // The package must be in the CREATED state
    if(tx.package.state !== 'CREATED'){
      throw new Error('Only CREATED packages can receive new coupons');
    }
  
    // All selected coupons must be in the CREATED state
    // All selected coupons must be assigned to the current broker
    for(i=0; i<tx.coupons.length; i++){
      if(tx.coupons[i].state !== 'CREATED'){
        throw new Error('Only CREATED coupons can be added to a package');
      }

      // Check if current caller is a broker listed in coupons[i].campaign.brokers
      // [...]
    }
    
    // Update coupons state
    for(i=0; i<tx.coupons.length; i++){
      tx.coupons[i].state = 'PACKAGED';
      tx.coupons[i].package = tx.package;
    }

    const AP = 'eu.sardcoin.assets';
    const couponsRegistry = await getAssetRegistry(AP + '.Coupon');
    const packagesRegistry = await getAssetRegistry(AP + '.Package');
    
    // Update coupons registry
    await couponsRegistry.updateAll(tx.coupons);
  
    // Update package registry
    tx.package.coupons = tx.coupons;
    tx.package.state = 'INITIALIZED';
    await packagesRegistry.update(tx.package);
  }



  /**
   * A consumer buys a package
   * @param {eu.sardcoin.transactions.BuyPackage} tx The transaction instance.
   * @transaction
   * 
   * CdU_***
   */
  async function onBuyPackage(tx){
      
    // The package must be in the INITIALIZED state
    if(tx.package.state !== 'INITIALIZED'){
      throw new Error('Only initialized packages can be bought');
    }
  
    // The package is now bought
    tx.package.state = 'BOUGHT';

    // All related coupons are now bought
    for(i=0; i<tx.package.coupons.length; i++){
      tx.package.coupons[i].state = 'BOUGHT';
  //  tx.package.coupons[i].consumer = getCurrentParticipant();
      tx.package.coupons[i].consumer = tx.caller;
    }
    
    const AP = 'eu.sardcoin.assets';
    const couponsRegistry = await getAssetRegistry(AP + '.Coupon');
    const packagesRegistry = await getAssetRegistry(AP + '.Package');

    // Save the updated coupons and the package
    await couponsRegistry.updateAll(tx.package.coupons);
    await packagesRegistry.update(tx.package);

  }



  /**
   * Given a campaign (within its creation time and minutes of delay), and 
   * the timestamp of the current transaction, this function calculates the timestamp
   * of publication and evaluates if the campaign has already been published or not.
   */
  function isCampaignPublic(campaign, timestamp){

    // If the number of minutes of delay is less than 10, give 10 minutes of delay 
    // for creating and publishing the addCoupons transaction 
    if(campaign.delay <= 10){
      minutes = 10;
    } else { 
      minutes = campaign.delay;
    }
    
    return timestamp >= (new Date(campaign.creationTime.getTime() + (60*1000*Math.abs(minutes))));
  }