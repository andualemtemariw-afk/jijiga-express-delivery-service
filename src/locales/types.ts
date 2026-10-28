export interface AppLocale {
  brandName: string;
  tagline: string;
  supportCustomPrompt: string;
  tabs: {
    dashboard: string;
    tracking: string;
    marketplace: string;
    history: string;
    profile: string;
  };
  services: {
    parcelTitle: string;
    parcelSubtitle: string;
    rideTitle: string;
    rideSubtitle: string;
    eeuTitle: string;
    eeuSubtitle: string;
    foodTitle: string;
    foodSubtitle: string;
  };
  routeMap: {
    bannerTitle: string;
    bannerSubtitle: string;
    liveRadar: string;
    telemetryTitle: string;
    courierStatus: string;
    speedLabel: string;
    etaLabel: string;
    distanceLabel: string;
    tamperSealLabel: string;
    centerOnCourier: string;
    fullscreen: string;
  };
  common: {
    confirmOrder: string;
    orderNow: string;
    cancel: string;
    trackLive: string;
    callDriver: string;
    chatCourier: string;
  };
  navigation: {
    home: string;
    services: string;
    orders: string;
    help: string;
    profile: string;
    cart: string;
  };
  superApp: {
    move: string;
    deliver: string;
    stay: string;
    more: string;
    taxi: string;
    moto: string;
    food: string;
    parcel: string;
    grocery: string;
    hotel: string;
    electricity: string;
    khat: string;
    helpCenter: string;
    loyaltyPoints: string;
  };
  cart: {
    title: string;
    itemsCount: string;
    subtotal: string;
    deliveryFee: string;
    serviceFee: string;
    total: string;
    checkoutCod: string;
    emptyCartTitle: string;
    emptyCartDesc: string;
    vendorMismatchWarning: string;
  };
  serviceability: {
    availableTitle: string;
    unsupportedTitle: string;
    unsupportedDesc: string;
  };
}
