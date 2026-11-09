
package com.menumoney;

import android.Manifest;
import android.app.Activity;
import android.content.ContentUris;
import android.content.ContentValues;
import android.content.Context;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.CalendarContract;
import android.util.Log;

import java.text.ParsePosition;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

public final class LoanCalendarManager {

    private static final String TAG = "LoanCalendarManager";

    private static final String PREFS = "menumoney_loan_widget";

    private static final String EVENT_URI =
            "menumoney://loan/next-payment";

    public static final int REQUEST_CALENDAR_PERMISSION = 7317;

    private LoanCalendarManager() {}

    // ================================================
    // CHECK CALENDAR PERMISSIONS
    // ================================================

    public static boolean hasCalendarPermission(Context context) {

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            return true;
        }

        return context.checkSelfPermission(
                Manifest.permission.READ_CALENDAR
        ) == PackageManager.PERMISSION_GRANTED

                && context.checkSelfPermission(
                Manifest.permission.WRITE_CALENDAR
        ) == PackageManager.PERMISSION_GRANTED;
    }

    // ================================================
    // REQUEST CALENDAR PERMISSIONS
    // ================================================

    public static void requestCalendarPermission(Activity activity) {

        if (hasCalendarPermission(activity)) {
            syncFromPreferences(activity);
            return;
        }

        activity.requestPermissions(
                new String[] {
                        Manifest.permission.READ_CALENDAR,
                        Manifest.permission.WRITE_CALENDAR
                },
                REQUEST_CALENDAR_PERMISSION
        );
    }

    // ================================================
    // AUTOMATIC CALENDAR SYNCHRONIZATION
    // ================================================

    public static void syncFromPreferences(Context context) {

        if (!hasCalendarPermission(context)) {

            Log.w(TAG, "Calendar permission has not been granted.");

            return;
        }

        try {

            android.content.SharedPreferences prefs =
                    context.getSharedPreferences(
                            PREFS,
                            Context.MODE_PRIVATE
                    );

            boolean hasCustomerData = prefs.getBoolean(
                    "hasCustomerData",
                    false
            );

            boolean paymentDue = prefs.getBoolean(
                    "paymentDue",
                    false
            );

            // Remove our event when there is no unpaid payment.
            if (!hasCustomerData || !paymentDue) {

                removeLoanEvent(context);

                return;
            }

            String dueDate = prefs.getString(
                    "dueDate",
                    ""
            );

            Calendar dueCalendar = parseDueDate(dueDate);

            if (dueCalendar == null) {

                Log.e(TAG, "Invalid loan due date: " + dueDate);

                return;
            }

            String amount = prefs.getString(
                    "amount",
                    "Payment due"
            );

            String bankName = prefs.getString(
                    "bankName",
                    ""
            );

            String message = prefs.getString(
                    "message",
                    ""
            );

            String accountNumber = prefs.getString(
                    "accountNumber",
                    ""
            );

            // Never expose the complete account number
            // in the phone calendar.
            if (!accountNumber.isEmpty()) {

                String digits = accountNumber.replaceAll(
                        "[^0-9]",
                        ""
                );

                accountNumber = digits.length() > 4
                        ? "****" + digits.substring(digits.length() - 4)
                        : "****";
            }

            createOrUpdateLoanEvent(
                    context,
                    dueCalendar,
                    amount,
                    bankName,
                    accountNumber,
                    message
            );

        } catch (SecurityException e) {

            Log.e(TAG, "Calendar access denied.", e);

        } catch (Exception e) {

            Log.e(TAG, "Calendar synchronization failed.", e);
        }
    }

    // ================================================
    // CREATE OR UPDATE CALENDAR EVENT
    // ================================================

    private static void createOrUpdateLoanEvent(
            Context context,
            Calendar dueCalendar,
            String amount,
            String bankName,
            String accountNumber,
            String message
    ) {

        Calendar eventStart = (Calendar) dueCalendar.clone();

        eventStart.set(Calendar.HOUR_OF_DAY, 9);
        eventStart.set(Calendar.MINUTE, 0);
        eventStart.set(Calendar.SECOND, 0);
        eventStart.set(Calendar.MILLISECOND, 0);

        startTime = eventStart.getTimeInMillis();

        Calendar eventEnd = (Calendar) eventStart.clone();

        eventEnd.add(Calendar.MINUTE, 30);

        String title = "MenuMoney Loan Repayment - " + amount;

        StringBuilder description = new StringBuilder();

        description.append("MenuMoney loan repayment reminder\n\n");

        description.append("Amount due: ")
                .append(amount);

        description.append("\nDue date: ")
                .append(formatDate(dueCalendar));

        if (!bankName.isEmpty()) {
            description.append("\nBank: ").append(bankName);
        }

        if (!accountNumber.isEmpty()) {
            description.append("\nAccount: ").append(accountNumber);
        }

        if (!message.isEmpty()) {
            description.append("\n\n").append(message);
        }

        description.append(
                "\n\nOpen MenuMoney to view your loan details."
        );

        long calendarId = findWritableCalendar(context);

        if (calendarId < 0) {

            Log.e(TAG, "No writable phone calendar was found.");

            return;
        }

        // ============================================
        // FIND EXISTING MENUMONEY EVENT
        // ============================================

        Long existingEventId = findExistingEvent(context);

        ContentValues values = new ContentValues();

        values.put(
                CalendarContract.Events.CALENDAR_ID,
                calendarId
        );

        values.put(
                CalendarContract.Events.TITLE,
                title
        );

        values.put(
                CalendarContract.Events.DESCRIPTION,
                description.toString()
        );

        values.put(
                CalendarContract.Events.DTSTART,
                startTime
        );

        values.put(
                CalendarContract.Events.DTEND,
                eventEnd.getTimeInMillis()
        );

        values.put(
                CalendarContract.Events.EVENT_TIMEZONE,
                TimeZone.getDefault().getID()
        );

        values.put(
                CalendarContract.Events.EVENT_END_TIMEZONE,
                TimeZone.getDefault().getID()
        );

        values.put(
                CalendarContract.Events.HAS_ALARM,
                1
        );

        values.put(
                CalendarContract.Events.AVAILABILITY,
                CalendarContract.Events.AVAILABILITY_FREE
        );

        values.put(
                CalendarContract.Events.STATUS,
                CalendarContract.Events.STATUS_CONFIRMED
        );

        values.put(
                CalendarContract.Events.CUSTOM_APP_PACKAGE,
                context.getPackageName()
        );

        values.put(
                CalendarContract.Events.CUSTOM_APP_URI,
                EVENT_URI
        );

        Uri eventUri = null;

        // ============================================
        // UPDATE EXISTING EVENT
        // ============================================

        if (existingEventId != null) {

            Uri existingUri = ContentUris.withAppendedId(
                    CalendarContract.Events.CONTENT_URI,
                    existingEventId
            );

            int updated = context.getContentResolver().update(
                    existingUri,
                    values,
                    null,
                    null
            );

            if (updated > 0) {

                eventUri = existingUri;

                Log.d(TAG, "Existing calendar event updated.");

                updateEventReminders(
                        context,
                        existingEventId,
                        calendarId
                );
            }
        }

        // ============================================
        // CREATE EVENT IF NECESSARY
        // ============================================

        if (eventUri == null) {

            eventUri = context.getContentResolver().insert(
                    CalendarContract.Events.CONTENT_URI,
                    values
            );

            if (eventUri == null) {

                Log.e(TAG, "Could not create calendar event.");

                return;
            }

            long newEventId = ContentUris.parseId(eventUri);

            saveEventReference(
                    context,
                    newEventId,
                    calendarId
            );

            addEventReminders(
                    context,
                    newEventId,
                    calendarId
            );

            Log.d(TAG, "New MenuMoney calendar event created.");

        } else {

            saveEventReference(
                    context,
                    ContentUris.parseId(eventUri),
                    calendarId
            );
        }
    }

    // ================================================
    // FIND WRITABLE CALENDAR
    // ================================================

    private static long findWritableCalendar(Context context) {

        String[] projection = {
                CalendarContract.Calendars._ID,
                CalendarContract.Calendars.CALENDAR_ACCESS_LEVEL
        };

        String selection =
                CalendarContract.Calendars.CALENDAR_ACCESS_LEVEL
                        + " >= ? AND "
                        + CalendarContract.Calendars.SYNC_EVENTS
                        + " = 1";

        String[] selectionArgs = {
                String.valueOf(
                        CalendarContract.Calendars.CAL_ACCESS_CONTRIBUTOR
                )
        };

        try (Cursor cursor = context.getContentResolver().query(
                CalendarContract.Calendars.CONTENT_URI,
                projection,
                selection,
                selectionArgs,
                CalendarContract.Calendars._ID + " ASC"
        )) {

            if (cursor != null && cursor.moveToFirst()) {

                return cursor.getLong(
                        cursor.getColumnIndexOrThrow(
                                CalendarContract.Calendars._ID
                        )
                );
            }

        }

        return -1L;
    }

    // ================================================
    // FIND EXISTING EVENT USING UNIQUE APP IDENTIFIER
    // ================================================

    private static Long findExistingEvent(Context context) {

        String[] projection = {
                CalendarContract.Events._ID
        };

        String selection =
                CalendarContract.Events.CUSTOM_APP_PACKAGE + " = ? AND "
                        + CalendarContract.Events.CUSTOM_APP_URI + " = ?";

        String[] args = {
                context.getPackageName(),
                EVENT_URI
        };

        List<Long> eventIds = new ArrayList<>();

        try (Cursor cursor = context.getContentResolver().query(
                CalendarContract.Events.CONTENT_URI,
                projection,
                selection,
                args,
                CalendarContract.Events._ID + " ASC"
        )) {

            if (cursor != null) {

                while (cursor.moveToNext()) {

                    eventIds.add(
                            cursor.getLong(0)
                    );
                }
            }
        }

        if (eventIds.isEmpty()) {
            return null;
        }

        // Keep one event and remove duplicates belonging to MenuMoney.
        Long primaryId = eventIds.get(0);

        for (int i = 1; i < eventIds.size(); i++) {

            deleteOwnedEvent(context, eventIds.get(i));
        }

        return primaryId;
    }

    // ================================================
    // ADD CALENDAR NOTIFICATIONS
    // ================================================

    private static void addEventReminders(
            Context context,
            long eventId,
            long calendarId
    ) {

        Uri remindersUri =
                CalendarContract.Reminders.CONTENT_URI;

        int[] reminderMinutes = {
                1440,
                0
        };

        for (int minutes : reminderMinutes) {

            ContentValues values = new ContentValues();

            values.put(
                    CalendarContract.Reminders.EVENT_ID,
                    eventId
            );

            values.put(
                    CalendarContract.Reminders.MINUTES,
                    minutes
            );

            values.put(
                    CalendarContract.Reminders.METHOD,
                    CalendarContract.Reminders.METHOD_ALERT
            );

            try {

                // Check whether this calendar supports ALERT reminders.
                if (!supportsAlertReminder(context, calendarId)) {

                    Log.w(
                            TAG,
                            "Selected calendar does not support alert reminders."
                    );

                    return;
                }

                context.getContentResolver().insert(
                        remindersUri,
                        values
                );

            } catch (Exception e) {

                Log.e(TAG, "Could not add calendar reminder.", e);
            }
        }
    }

    // ================================================
    // CHECK CALENDAR REMINDER SUPPORT
    // ================================================

    private static boolean supportsAlertReminder(
            Context context,
            long calendarId
    ) {

        String[] projection = {
                CalendarContract.Calendars.CALENDAR_ALLOWED_REMINDERS
        };

        String selection =
                CalendarContract.Calendars._ID + " = ?";

        try (Cursor cursor = context.getContentResolver().query(
                CalendarContract.Calendars.CONTENT_URI,
                projection,
                selection,
                new String[]{String.valueOf(calendarId)},
                null
        )) {

            if (cursor != null && cursor.moveToFirst()) {

                String allowed = cursor.getString(0);

                if (allowed == null) {
                    return false;
                }

                for (String method : allowed.split(",")) {

                    if (CalendarContract.Reminders.METHOD_ALERT
                            == Integer.parseInt(method.trim())) {

                        return true;
                    }
                }
            }

        } catch (Exception e) {

            Log.e(TAG, "Could not check calendar reminder support.", e);
        }

        return false;
    }

    // ================================================
    // UPDATE EXISTING EVENT REMINDERS
    // ================================================

    private static void updateEventReminders(
            Context context,
            long eventId,
            long calendarId
    ) {

        context.getContentResolver().delete(
                CalendarContract.Reminders.CONTENT_URI,
                CalendarContract.Reminders.EVENT_ID + " = ?",
                new String[]{String.valueOf(eventId)}
        );

        addEventReminders(
                context,
                eventId,
                calendarId
        );
    }

    // ================================================
    // SAVE EVENT ID LOCALLY
    // ================================================

    private static void saveEventReference(
            Context context,
            long eventId,
            long calendarId
    ) {

        context.getSharedPreferences(
                PREFS,
                Context.MODE_PRIVATE
        ).edit()
                .putLong("loanCalendarEventId", eventId)
                .putLong("loanCalendarId", calendarId)
                .apply();
    }

    // ================================================
    // DELETE ONLY MENUMONEY-OWNED EVENTS
    // ================================================

    private static void deleteOwnedEvent(
            Context context,
            long eventId
    ) {

        String selection =
                CalendarContract.Events._ID + " = ? AND "
                        + CalendarContract.Events.CUSTOM_APP_PACKAGE + " = ? AND "
                        + CalendarContract.Events.CUSTOM_APP_URI + " = ?";

        context.getContentResolver().delete(
                CalendarContract.Events.CONTENT_URI,
                selection,
                new String[]{
                        String.valueOf(eventId),
                        context.getPackageName(),
                        EVENT_URI
                }
        );
    }

    // ================================================
    // REMOVE LOAN EVENT AFTER PAYMENT
    // ================================================

    public static void removeLoanEvent(Context context) {

        if (!hasCalendarPermission(context)) {

            Log.w(TAG, "Cannot remove event without calendar permission.");

            return;
        }

        try {

            Long eventId = findExistingEvent(context);

            if (eventId != null) {

                deleteOwnedEvent(context, eventId);

                Log.d(TAG, "MenuMoney calendar event removed.");
            }

            context.getSharedPreferences(
                    PREFS,
                    Context.MODE_PRIVATE
            ).edit()
                    .remove("loanCalendarEventId")
                    .remove("loanCalendarId")
                    .apply();

        } catch (Exception e) {

            Log.e(TAG, "Could not remove loan calendar event.", e);
        }
    }

    // ================================================
    // DATE PARSING
    // ================================================

    private static Calendar parseDueDate(String value) {

        if (value == null || value.trim().isEmpty()) {
            return null;
        }

        String[] formats = {
                "yyyy-MM-dd",
                "dd/MM/yyyy"
        };

        for (String format : formats) {

            SimpleDateFormat sdf = new SimpleDateFormat(
                    format,
                    Locale.US
            );

            sdf.setLenient(false);

            ParsePosition position = new ParsePosition(0);

            Date date = sdf.parse(
                    value.trim(),
                    position
            );

            if (date != null
                    && position.getIndex() == value.trim().length()) {

                Calendar calendar = Calendar.getInstance();

                calendar.setTime(date);

                return calendar;
            }
        }

        return null;
    }

    private static String formatDate(Calendar calendar) {

        return new SimpleDateFormat(
                "dd/MM/yyyy",
                Locale.getDefault()
        ).format(calendar.getTime());
    }
}
