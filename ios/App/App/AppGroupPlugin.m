#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Register the AppGroupPlugin so Capacitor bridges it to JavaScript.
CAP_PLUGIN(AppGroupPlugin, "AppGroupPlugin",
    CAP_PLUGIN_METHOD(readPendingImage, CAPPluginReturnPromise);
)
