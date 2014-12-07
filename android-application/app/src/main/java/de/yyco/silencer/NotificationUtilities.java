package de.yyco.silencer;

import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.NotificationManager;
import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.PackageManager.NameNotFoundException;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.Drawable;
import android.os.Build;
import android.os.Bundle;
import android.preference.PreferenceManager;
import android.widget.RemoteViews;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.UnsupportedEncodingException;
import java.lang.reflect.Field;
import java.security.InvalidAlgorithmParameterException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.InvalidParameterSpecException;
import java.util.ArrayList;
import java.util.Random;

import javax.crypto.BadPaddingException;
import javax.crypto.IllegalBlockSizeException;
import javax.crypto.NoSuchPaddingException;

@SuppressWarnings("deprecation")
public class NotificationUtilities {

    public static boolean process(Context c, Notification n, String packageName, int id) {
        // Get encryption params
        String salt = Long.toHexString(new Random().nextLong());
        String secret = PreferenceManager.getDefaultSharedPreferences(c).getString(Cryptography.PREF_KEY, "");

        if (secret.isEmpty()) return false;
        if (packageName.equals(c.getPackageName())) return true;

        // Magically extract text from notification
        ArrayList<String> notificationData = NotificationUtilities.getNotificationText(n);

        // Use PackageManager to get application name and icon
        final PackageManager pm = c.getPackageManager();
        ApplicationInfo ai;
        try {
            ai = pm.getApplicationInfo(packageName, 0);
        } catch (final NameNotFoundException e) {
            return false;
        }

        // Create header and body of notification
        String notificationBody = "";
        String notificationHeader = "";

        if (notificationData != null && notificationData.size() > 0) {
            notificationHeader = notificationData.get(0);
            if (notificationData.size() > 1) {
                notificationBody = notificationData.get(1);
            }
        } else {
            return false;
        }

        for (int i = 2; i < notificationData.size(); i++) {
            notificationBody += "\n" + notificationData.get(i);
        }

        // Create JSON object with all necessary information
        JSONObject obj=new JSONObject();
        try {
            obj.put("p",packageName);
            obj.put("l",ai.loadLabel(pm).toString());
            obj.put("t",notificationHeader);
            obj.put("b",notificationBody);
            obj.put("n",Integer.toString(id));
        } catch (JSONException e) {
            e.printStackTrace();
            return false;
        }

        // Show notification momentarily so it is picked up by PushBullet
        Notification.Builder mBuilder = null;
        try {
            mBuilder = new Notification.Builder(c)
                    .setContentTitle(salt)
                    .setContentText(encrypt(obj.toString(),secret, salt))
                    .setSmallIcon(R.drawable.ic_launcher)
                    .setPriority(Notification.PRIORITY_LOW)
                    .setLargeIcon(n.largeIcon != null ? n.largeIcon : drawableToBitmap(pm.getApplicationIcon(ai)));
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }

        NotificationManager mNotificationManager =
                (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);

        mNotificationManager.notify(0, mBuilder.build());
        mNotificationManager.cancel(0);

        return true;
    }

    @SuppressLint("DefaultLocale")
    public static ArrayList<String> getNotificationText(Notification notification) {
        if (android.os.Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            Bundle extras = notification.extras;

            ArrayList<String> notificationData = new ArrayList<String>();

            if (extras.getString("android.title") != null) notificationData.add(extras.getString("android.title"));
            if (extras.getString("android.text") != null) notificationData.add(extras.getString("android.text"));
            if (extras.getString("android.subText") != null) notificationData.add(extras.getString("android.subText"));

            return notificationData;
        }
        else {
            RemoteViews views = notification.contentView;
            Class<?> secretClass = views.getClass();

            try {
                ArrayList<String> notificationData = new ArrayList<String>();

                Field outerFields[] = secretClass.getDeclaredFields();
                for (int i = 0; i < outerFields.length; i++) {
                    if (!outerFields[i].getName().equals("mActions"))
                        continue;

                    outerFields[i].setAccessible(true);

                    @SuppressWarnings("unchecked")
                    ArrayList<Object> actions = (ArrayList<Object>) outerFields[i]
                            .get(views);
                    for (Object action : actions) {
                        Field innerFields[] = action.getClass().getDeclaredFields();

                        Object value = null;
                        for (Field field : innerFields) {
                            field.setAccessible(true);
                            // Value field could possibly contain text
                            if (field.getName().equals("value")) {
                                value = field.get(action);
                            }
                        }

                        // Check if value is a String
                        if (value != null
                                && value.getClass().getName().toUpperCase()
                                .contains("STRING")) {

                            notificationData.add(value.toString());
                        }
                    }

                    return notificationData;
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
        return null;
    }

    public static Bitmap drawableToBitmap(Drawable drawable) {
        if (drawable instanceof BitmapDrawable) {
            return ((BitmapDrawable) drawable).getBitmap();
        }

        Bitmap bitmap = Bitmap.createBitmap(drawable.getIntrinsicWidth(),
                drawable.getIntrinsicHeight(), Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        drawable.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
        drawable.draw(canvas);

        return bitmap;
    }

    public static String encrypt(String data, String secret, String salt) throws NoSuchAlgorithmException, InvalidKeySpecException, NoSuchPaddingException, InvalidKeyException, InvalidParameterSpecException, UnsupportedEncodingException, BadPaddingException, IllegalBlockSizeException, InvalidAlgorithmParameterException {
        return Cryptography.encrypt(data, secret, salt);
    }
}
