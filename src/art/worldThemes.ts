/** Presentation only: floor materials and motifs, never simulation numbers. */
export type RouteMaterial = 'asphalt'|'conveyor'|'tile'|'cable'|'boardwalk'|'pier'|'fibre'|'track'|'carpet'|'sand'|'stone'|'scaffold'|'fair';
export const ROUTE_MATERIAL: Record<string,RouteMaterial> = {
 bike:'asphalt',dropship:'conveyor',restaurant:'tile',tiktok:'cable',ai:'fibre',foodtruck:'boardwalk',beachclub:'boardwalk',yachts:'pier',realestate:'asphalt',crypto:'fibre',supercars:'track',hotel:'carpet',safari:'sand',souk:'stone',tower:'scaffold',fest:'fair',
};
export const PANEL_WORLDS: Record<string,string> = {upgrade:'dropship',unlock:'tower',plot:'realestate',ipo:'crypto',world:'yachts',office:'office',school:'ai',daily:'bike',missions:'dropship',wheel:'fest',achievements:'hotel',shop:'souk',life:'realestate',league:'supercars',event:'fest',season:'fest',empire:'tower',invite:'foodtruck',cloud:'ai',settings:'bike',feedback:'restaurant',legal:'office',execs:'hotel'};
export const PANEL_ICONS: Record<string,string> = {upgrade:'production',unlock:'construction',plot:'home',ipo:'ipo',world:'world',office:'city',school:'school',daily:'daily',missions:'missions',wheel:'wheel',achievements:'trophy',shop:'premium',life:'life',league:'trophy',event:'fest_trophy',season:'lux_pumpkin',empire:'city',invite:'invite',cloud:'cloud',settings:'settings',feedback:'feedback',legal:'missions',execs:'execs'};
