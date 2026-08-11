//
//  AppDelegate.swift
//  MedWallet MZ
//
//  Capacidades:
//  - Push Notifications (FCM via APNs)
//  - Deep Links (medwallet:// scheme + Universal Links)
//  - Splash screen lifecycle
//  - Analytics de inicialização
//

import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        print("[MedWallet] App launching — Capacitor bridge init")
        return true
    }

    // MARK: - Deep Links (URL scheme)
    func application(_ app: UIApplication,
                     open url: URL,
                     options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // medwallet://register?role=driver
        print("[MedWallet] Deep link opened: \(url.absoluteString)")
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    // MARK: - Universal Links (associated domains)
    func application(_ application: UIApplication,
                     continue userActivity: NSUserActivity,
                     restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // https://medwalletmz.online/register?role=driver
        guard userActivity.activityType == NSUserActivityTypeBrowsingWeb,
              let url = userActivity.webpageURL else {
            return false
        }
        print("[MedWallet] Universal link: \(url.absoluteString)")
        return ApplicationDelegateProxy.shared.application(application,
                                                              continue: userActivity,
                                                              restorationHandler: restorationHandler)
    }

    // MARK: - Push Notifications
    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        print("[MedWallet] Push token registered")
        NotificationCenter.default.post(
            name: .capacitorDidRegisterForRemoteNotifications,
            object: deviceToken
        )
    }

    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("[MedWallet] Push token failed: \(error.localizedDescription)")
        NotificationCenter.default.post(
            name: .capacitorDidFailToRegisterForRemoteNotifications,
            object: error
        )
    }

    // MARK: - Lifecycle
    func applicationDidBecomeActive(_ application: UIApplication) {
        print("[MedWallet] App became active")
    }

    func applicationWillResignActive(_ application: UIApplication) {
        print("[MedWallet] App resigning active")
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        print("[MedWallet] App entered background")
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        print("[MedWallet] App entering foreground")
    }
}
