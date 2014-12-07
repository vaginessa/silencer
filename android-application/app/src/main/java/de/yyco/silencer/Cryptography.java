package de.yyco.silencer;

import android.util.Base64;

import java.io.UnsupportedEncodingException;
import java.security.spec.KeySpec;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;

public class Cryptography {
    public static final String KEY_ALGORITHM            = "PBKDF2WithHmacSHA1";
    public static final int KEY_ITERATIONS              = 8;
    public static final int KEY_LENGTH                  = 256;

    public static final String CIPHER_TRANSFORMATION    = "AES/CBC/PKCS7Padding";
    public static final byte[] IV                       = new byte[16];

    public static final String PREF_KEY                 = "KEY";

    public static String encrypt(String data, String secret, String salt) {
        try {
            return encrypt(data.getBytes("UTF-8"), secret, salt);
        } catch (UnsupportedEncodingException e) {
            e.printStackTrace();
            return null;
        }
    }

    public static String encrypt(byte[] data, String secret, String salt) {
        try {
            SecretKeyFactory secretKeyFactory = SecretKeyFactory.getInstance(KEY_ALGORITHM);
            KeySpec keySpec = new PBEKeySpec(secret.toCharArray(), salt.getBytes("UTF-8"), KEY_ITERATIONS, KEY_LENGTH);

            SecretKey temporarySecretKey = secretKeyFactory.generateSecret(keySpec);
            SecretKey secretKey = new SecretKeySpec(temporarySecretKey.getEncoded(), "AES");

            Cipher cipher = Cipher.getInstance(CIPHER_TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, new IvParameterSpec(IV));

            return Base64.encodeToString(cipher.doFinal(data), Base64.NO_WRAP);
        }
        catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }
}
