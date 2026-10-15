package expo.modules.medicinexpcontacts

import android.accounts.AbstractAccountAuthenticator
import android.accounts.Account
import android.accounts.AccountAuthenticatorResponse
import android.accounts.AccountManager
import android.app.Service
import android.content.AbstractThreadedSyncAdapter
import android.content.ContentProviderClient
import android.content.Context
import android.content.Intent
import android.content.SyncResult
import android.os.Bundle
import android.os.IBinder

/**
 * The "MedicineXP" account the lead contacts belong to. It has no login: the app creates it
 * itself (addAccountExplicitly), so every request from Settings just does nothing.
 */
class AuthenticatorService : Service() {
  private lateinit var authenticator: Authenticator

  override fun onCreate() {
    super.onCreate()
    authenticator = Authenticator(this)
  }

  override fun onBind(intent: Intent?): IBinder? = authenticator.iBinder
}

class Authenticator(context: Context) : AbstractAccountAuthenticator(context) {
  override fun editProperties(response: AccountAuthenticatorResponse?, accountType: String?): Bundle? = null

  override fun addAccount(
    response: AccountAuthenticatorResponse?,
    accountType: String?,
    authTokenType: String?,
    requiredFeatures: Array<out String>?,
    options: Bundle?
  ): Bundle? = null

  override fun confirmCredentials(response: AccountAuthenticatorResponse?, account: Account?, options: Bundle?): Bundle? = null

  override fun getAuthToken(
    response: AccountAuthenticatorResponse?,
    account: Account?,
    authTokenType: String?,
    options: Bundle?
  ): Bundle? = null

  override fun getAuthTokenLabel(authTokenType: String?): String? = null

  override fun updateCredentials(
    response: AccountAuthenticatorResponse?,
    account: Account?,
    authTokenType: String?,
    options: Bundle?
  ): Bundle? = null

  override fun hasFeatures(response: AccountAuthenticatorResponse?, account: Account?, features: Array<out String>?): Bundle =
    Bundle().apply { putBoolean(AccountManager.KEY_BOOLEAN_RESULT, false) }
}

/**
 * Contacts only show in the Contacts app and on the call screen for accounts that have a
 * contacts sync adapter. This one never syncs: the app writes the contacts directly.
 */
class SyncService : Service() {
  override fun onCreate() {
    super.onCreate()
    synchronized(lock) {
      if (adapter == null) {
        adapter = NoopSyncAdapter(applicationContext)
      }
    }
  }

  override fun onBind(intent: Intent?): IBinder? = adapter?.syncAdapterBinder

  companion object {
    private val lock = Any()
    private var adapter: NoopSyncAdapter? = null
  }
}

class NoopSyncAdapter(context: Context) : AbstractThreadedSyncAdapter(context, true) {
  override fun onPerformSync(
    account: Account?,
    extras: Bundle?,
    authority: String?,
    provider: ContentProviderClient?,
    syncResult: SyncResult?
  ) {
    // Nothing to sync: contacts come from the app, never from a server
  }
}
