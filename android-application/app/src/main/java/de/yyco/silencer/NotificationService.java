package de.yyco.silencer;

import android.annotation.TargetApi;
import android.os.Build;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

@TargetApi(Build.VERSION_CODES.JELLY_BEAN_MR2)
public class NotificationService extends NotificationListenerService {

    @Override
    public void onNotificationPosted(StatusBarNotification arg0) {
        NotificationUtilities.process(this,
                arg0.getNotification(), arg0.getPackageName(), arg0.getId());
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification arg0) {
    }

}
