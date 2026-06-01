import type * as Leaflet from "leaflet";

declare module "leaflet" {
  interface MarkerCluster {
    getChildCount(): number;
  }

  interface MarkerClusterGroup extends FeatureGroup {
    addLayer(layer: Layer): this;
    clearLayers(): this;
  }

  type MarkerClusterGroupOptions = {
    maxClusterRadius?: number;
    disableClusteringAtZoom?: number;
    spiderfyOnMaxZoom?: boolean;
    showCoverageOnHover?: boolean;
    zoomToBoundsOnClick?: boolean;
    removeOutsideVisibleBounds?: boolean;
    animate?: boolean;
    iconCreateFunction?: (cluster: MarkerCluster) => DivIcon;
  };

  function markerClusterGroup(options?: MarkerClusterGroupOptions): MarkerClusterGroup;
}

declare module "leaflet.markercluster" {
  export = Leaflet;
}
