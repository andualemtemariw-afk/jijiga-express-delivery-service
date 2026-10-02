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
}
