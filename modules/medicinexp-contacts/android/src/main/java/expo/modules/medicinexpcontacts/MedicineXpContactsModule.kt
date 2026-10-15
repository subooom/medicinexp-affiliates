package expo.modules.medicinexpcontacts

import android.accounts.Account
import android.accounts.AccountManager
import android.content.ContentProviderOperation
import android.content.ContentResolver
import android.content.ContentValues
import android.content.Context
import android.net.Uri
import android.provider.ContactsContract
import android.provider.ContactsContract.CommonDataKinds.Note
import android.provider.ContactsContract.CommonDataKinds.Organization
import android.provider.ContactsContract.CommonDataKinds.Phone
import android.provider.ContactsContract.CommonDataKinds.StructuredName
import android.provider.ContactsContract.Data
import android.provider.ContactsContract.RawContacts
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

const val ACCOUNT_TYPE = "com.medicinexp.affiliates.contacts"
const val ACCOUNT_NAME = "MedicineXP"

/**
 * Saves lead contacts under the app's own "MedicineXP" account (see AccountServices.kt).
 * They show in Contacts and on the call screen like any contact, but aren't synced to the
 * rep's Google account and go away when the app is uninstalled (or removeAll on leaving).
 *
 * A contact is matched by phone number (last 10 digits), so it's never duplicated.
 * The caller must hold READ_CONTACTS + WRITE_CONTACTS (asked from JS).
 */
class MedicineXpContactsModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("MedicineXpContacts")

    /**
     * Create or update the contact for this phone number. Empty company / title / note leave
     * that field as it is. create = false only updates a contact that already exists.
     * Returns "created", "updated" or "skipped".
     */
    AsyncFunction("upsert") { phone: String, displayName: String, company: String, title: String, note: String, create: Boolean ->
      upsert(phone, displayName, company, title, note, create)
    }

    /** Delete every contact the app saved and the account itself (rep left / suspended). */
    AsyncFunction("removeAll") {
      removeAll()
    }

    /** How many contacts the app has saved (0 when the account doesn't exist yet). */
    AsyncFunction("count") {
      rawContactIds().size
    }
  }

  private fun syncUri(uri: Uri): Uri =
    uri.buildUpon().appendQueryParameter(ContactsContract.CALLER_IS_SYNCADAPTER, "true").build()

  private fun ensureAccount() {
    val manager = AccountManager.get(context)
    if (manager.getAccountsByType(ACCOUNT_TYPE).isNotEmpty()) return

    val account = Account(ACCOUNT_NAME, ACCOUNT_TYPE)
    manager.addAccountExplicitly(account, null, null)
    ContentResolver.setIsSyncable(account, ContactsContract.AUTHORITY, 1)
    ContentResolver.setSyncAutomatically(account, ContactsContract.AUTHORITY, false)

    // Contacts outside any group are hidden unless the account says otherwise
    val settings = ContentValues().apply {
      put(ContactsContract.Settings.ACCOUNT_NAME, ACCOUNT_NAME)
      put(ContactsContract.Settings.ACCOUNT_TYPE, ACCOUNT_TYPE)
      put(ContactsContract.Settings.UNGROUPED_VISIBLE, 1)
      put(ContactsContract.Settings.SHOULD_SYNC, 0)
    }
    context.contentResolver.insert(syncUri(ContactsContract.Settings.CONTENT_URI), settings)
  }

  private fun digits(phone: String): String = phone.filter { it.isDigit() }.takeLast(10)

  /** Our raw contact with this phone number, or null. */
  private fun findByPhone(phone: String): Long? {
    val wanted = digits(phone)
    if (wanted.isEmpty()) return null
    context.contentResolver.query(
      Data.CONTENT_URI,
      arrayOf(Data.RAW_CONTACT_ID, Phone.NUMBER),
      "${Data.MIMETYPE} = ? AND ${RawContacts.ACCOUNT_TYPE} = ?",
      arrayOf(Phone.CONTENT_ITEM_TYPE, ACCOUNT_TYPE),
      null
    )?.use { cursor ->
      while (cursor.moveToNext()) {
        val number = cursor.getString(1) ?: continue
        if (digits(number) == wanted) return cursor.getLong(0)
      }
    }
    return null
  }

  private fun rawContactIds(): List<Long> {
    val ids = mutableListOf<Long>()
    context.contentResolver.query(
      RawContacts.CONTENT_URI,
      arrayOf(RawContacts._ID),
      "${RawContacts.ACCOUNT_TYPE} = ? AND ${RawContacts.DELETED} = 0",
      arrayOf(ACCOUNT_TYPE),
      null
    )?.use { cursor ->
      while (cursor.moveToNext()) ids.add(cursor.getLong(0))
    }
    return ids
  }

  private fun upsert(phone: String, displayName: String, company: String, title: String, note: String, create: Boolean): String {
    if (digits(phone).isEmpty()) return "skipped"
    val existing = findByPhone(phone)

    if (existing == null) {
      if (!create) return "skipped"
      ensureAccount()
      val ops = arrayListOf(
        ContentProviderOperation.newInsert(syncUri(RawContacts.CONTENT_URI))
          .withValue(RawContacts.ACCOUNT_TYPE, ACCOUNT_TYPE)
          .withValue(RawContacts.ACCOUNT_NAME, ACCOUNT_NAME)
          .build(),
        dataInsert(StructuredName.CONTENT_ITEM_TYPE)
          .withValue(StructuredName.DISPLAY_NAME, displayName)
          .build(),
        dataInsert(Phone.CONTENT_ITEM_TYPE)
          .withValue(Phone.NUMBER, phone)
          .withValue(Phone.TYPE, Phone.TYPE_WORK)
          .build(),
        dataInsert(Organization.CONTENT_ITEM_TYPE)
          .withValue(Organization.COMPANY, company)
          .withValue(Organization.TITLE, title)
          .withValue(Organization.TYPE, Organization.TYPE_WORK)
          .build(),
        dataInsert(Note.CONTENT_ITEM_TYPE)
          .withValue(Note.NOTE, note)
          .build()
      )
      context.contentResolver.applyBatch(ContactsContract.AUTHORITY, ops)
      return "created"
    }

    if (displayName.isNotEmpty()) {
      setData(existing, StructuredName.CONTENT_ITEM_TYPE, ContentValues().apply { put(StructuredName.DISPLAY_NAME, displayName) })
    }
    if (company.isNotEmpty() || title.isNotEmpty()) {
      setData(existing, Organization.CONTENT_ITEM_TYPE, ContentValues().apply {
        if (company.isNotEmpty()) put(Organization.COMPANY, company)
        if (title.isNotEmpty()) put(Organization.TITLE, title)
        put(Organization.TYPE, Organization.TYPE_WORK)
      })
    }
    if (note.isNotEmpty()) {
      setData(existing, Note.CONTENT_ITEM_TYPE, ContentValues().apply { put(Note.NOTE, note) })
    }
    return "updated"
  }

  /** Back-reference to the raw contact inserted first in the same batch. */
  private fun dataInsert(mimeType: String): ContentProviderOperation.Builder =
    ContentProviderOperation.newInsert(syncUri(Data.CONTENT_URI))
      .withValueBackReference(Data.RAW_CONTACT_ID, 0)
      .withValue(Data.MIMETYPE, mimeType)

  /** Update this kind of data on the raw contact, or add it if it isn't there yet. */
  private fun setData(rawContactId: Long, mimeType: String, values: ContentValues) {
    val updated = context.contentResolver.update(
      syncUri(Data.CONTENT_URI),
      values,
      "${Data.RAW_CONTACT_ID} = ? AND ${Data.MIMETYPE} = ?",
      arrayOf(rawContactId.toString(), mimeType)
    )
    if (updated == 0) {
      values.put(Data.RAW_CONTACT_ID, rawContactId)
      values.put(Data.MIMETYPE, mimeType)
      context.contentResolver.insert(syncUri(Data.CONTENT_URI), values)
    }
  }

  private fun removeAll(): Int {
    // Sync-adapter delete removes the rows for real (not just marks them deleted)
    val deleted = context.contentResolver.delete(
      syncUri(RawContacts.CONTENT_URI),
      "${RawContacts.ACCOUNT_TYPE} = ?",
      arrayOf(ACCOUNT_TYPE)
    )
    val manager = AccountManager.get(context)
    manager.getAccountsByType(ACCOUNT_TYPE).forEach { manager.removeAccountExplicitly(it) }
    return deleted
  }
}
