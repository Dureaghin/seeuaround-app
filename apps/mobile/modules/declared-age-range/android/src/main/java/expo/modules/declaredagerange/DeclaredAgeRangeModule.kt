package expo.modules.declaredagerange

import com.google.android.play.agesignals.AgeSignalsAccessRequest
import com.google.android.play.agesignals.AgeSignalsManagerFactory
import com.google.android.play.agesignals.AgeSignalsRequest
import com.google.android.play.agesignals.AgeSignalsStatus
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class DeclaredAgeRangeModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("DeclaredAgeRange")

    AsyncFunction("requestAdult") { promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.resolve(mapOf("status" to "unavailable"))
        return@AsyncFunction
      }

      val manager = AgeSignalsManagerFactory.create(activity.applicationContext)
      val access = AgeSignalsAccessRequest.builder().setActivity(activity).build()
      manager.requestAgeSignalsAccess(access)
        .addOnSuccessListener { accessResult ->
          when (accessResult.ageSignalsStatus()) {
            AgeSignalsStatus.NOT_SHARED -> promise.resolve(mapOf("status" to "declined"))
            AgeSignalsStatus.VERIFICATION_REQUIRED -> promise.resolve(mapOf("status" to "unavailable"))
            AgeSignalsStatus.SHARED -> {
              manager.checkAgeSignals(AgeSignalsRequest.builder().build())
                .addOnSuccessListener { result ->
                  val lower = result.ageLower()
                  val upper = result.ageUpper()
                  val status = when {
                    upper != null && upper < 18 -> "under"
                    lower != null && lower >= 18 -> "adult"
                    else -> "unknown"
                  }
                  promise.resolve(mapOf("status" to status))
                }
                .addOnFailureListener {
                  promise.resolve(mapOf("status" to "unavailable"))
                }
            }
            else -> promise.resolve(mapOf("status" to "unavailable"))
          }
        }
        .addOnFailureListener {
          promise.resolve(mapOf("status" to "unavailable"))
        }
    }
  }
}
