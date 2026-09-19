package mz.medwallet

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.view.View
import android.widget.RemoteViews

/// ── Widget "Próxima Toma" (EXCLUSIVO MÓVEL) ──────────────────────────
///
/// Mostra no ecrã inicial do telefone a próxima toma do plano de
/// medicação. A app Flutter escreve o estado (título + hora) aqui via
/// MethodChannel (`mz.medwallet/native` → refreshNextDoseWidget), que
/// grava em SharedPreferences e re-renderiza. O estado persiste no
/// ficheiro FlutterSharedPreferences, portanto sobrevive a reinícios
/// e ao re-render periódico (30 min) sem precisar de abrir a app.
///
/// Toque no widget abre a app directamente na Medicação (rota /meds).
class NextDoseWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        val prefs = context.getSharedPreferences(
            "FlutterSharedPreferences", Context.MODE_PRIVATE
        )
        val hasDose = prefs.getBoolean(PREF_HAS_DOSE, false)
        val title = prefs.getString(PREF_TITLE, "") ?: ""
        val subtitle = prefs.getString(PREF_SUBTITLE, "") ?: ""
        for (id in ids) {
            manager.updateAppWidget(id, buildViews(context, hasDose, title, subtitle))
        }
    }

    companion object {
        private const val PREF_HAS_DOSE = "flutter.wdg_has_dose"
        private const val PREF_TITLE = "flutter.wdg_title"
        private const val PREF_SUBTITLE = "flutter.wdg_subtitle"

        /// Constroi as RemoteViews do widget para o estado dado.
        private fun buildViews(
            context: Context,
            hasDose: Boolean,
            title: String,
            subtitle: String,
        ): RemoteViews {
            val views = RemoteViews(context.packageName, R.layout.next_dose_widget)
            if (hasDose && title.isNotBlank()) {
                views.setViewVisibility(R.id.wdg_empty, View.GONE)
                views.setViewVisibility(R.id.wdg_content, View.VISIBLE)
                views.setTextViewText(R.id.wdg_title, title)
                views.setTextViewText(R.id.wdg_subtitle, subtitle)
                // Hora extraída do subtítulo para o badge circular.
                val time = Regex("\\d{1,2}:\\d{2}").find(subtitle)?.value
                views.setTextViewText(R.id.wdg_clock, time ?: "••:••")
            } else {
                views.setViewVisibility(R.id.wdg_empty, View.VISIBLE)
                views.setViewVisibility(R.id.wdg_content, View.GONE)
                views.setTextViewText(R.id.wdg_clock, "••:••")
            }
            // Toque em qualquer parte → Medicação.
            val intent = Intent(context, MainActivity::class.java).apply {
                putExtra("route", "/meds")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            }
            val pi = PendingIntent.getActivity(
                context, 11, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            views.setOnClickPendingIntent(R.id.wdg_root, pi)
            return views
        }

        /// Chamado do Dart via MethodChannel: persiste o estado e
        /// re-renderiza todas as instâncias do widget.
        @JvmStatic
        fun refresh(
            context: Context,
            hasDose: Boolean,
            title: String?,
            subtitle: String?,
        ) {
            val prefs = context.getSharedPreferences(
                "FlutterSharedPreferences", Context.MODE_PRIVATE
            )
            prefs.edit()
                .putBoolean(PREF_HAS_DOSE, hasDose)
                .putString(PREF_TITLE, title ?: "")
                .putString(PREF_SUBTITLE, subtitle ?: "")
                .apply()
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(
                ComponentName(context, NextDoseWidgetProvider::class.java)
            )
            if (ids.isEmpty()) return
            val views = buildViews(context, hasDose, title ?: "", subtitle ?: "")
            for (id in ids) manager.updateAppWidget(id, views)
        }
    }
}
