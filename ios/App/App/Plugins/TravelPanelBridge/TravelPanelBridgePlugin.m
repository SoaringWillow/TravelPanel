#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Registers the Swift plugin class with the Capacitor bridge.
// Required for Capacitor 3+ plugin registration.
CAP_PLUGIN(TravelPanelBridgePlugin, "TravelPanelBridge",
    CAP_PLUGIN_METHOD(readAppGroupData, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(clearAppGroupData, CAPPluginReturnPromise);
)
