# Sichere Einführung von Version 2

## Grundprinzip

Die aktuell laufende Render-Version bleibt online, während Version 2 lokal
vorbereitet und getestet wird. Erst nach erfolgreichem Test wird der neue
Stand zu GitHub gepusht und von Render bereitgestellt.

Die Datenbankmigration ist rückwärtskompatibel:

- Die bestehende Spalte `bookings.sup` bleibt erhalten.
- Die neue Spalte `bookings.device_id` wird nur ergänzt.
- Bestehende Buchungen werden automatisch anhand des bisherigen Namens
  mit `rental_devices.id` verbunden.
- Buchungen, Abrechnungs-PDFs und Geräte werden nicht gelöscht.
- Geräte werden im Adminbereich deaktiviert statt aus der Datenbank entfernt.

## Empfohlene Reihenfolge

1. Aktuellen Projektordner vollständig sichern.
2. In Git einen neuen Branch erstellen:
   `git checkout -b v2-device-management`
3. Die Dateien aus diesem Paket in das Projekt kopieren.
4. Lokal starten:
   `npm.cmd start`
5. Folgende Funktionen testen:
   - Gästeseite lädt
   - vorhandene Buchungen sichtbar
   - neue Buchung möglich
   - Überschneidungsschutz funktioniert
   - Admin-Login
   - Buchung löschen
   - Abrechnung berechnen
   - PDF erstellen, öffnen und löschen
   - Gerät bearbeiten
   - neues Gerät anlegen
   - Gerät deaktivieren
6. Erst danach committen und pushen.
7. Render-Deployment beobachten.
8. Nach dem Deployment `/api/health`, Gästeseite und Adminseite prüfen.

## Rollback

Da die Migration nur neue Strukturen ergänzt, kann bei einem Problem sofort
wieder der vorherige Git-Commit auf Render deployed werden. Die alte Version
kann weiterhin mit `bookings.sup` arbeiten.

## Wichtiger Hinweis

Beim Render-Deployment kann es je nach Dienstkonfiguration zu einem kurzen
Neustart kommen. Der eigentliche Umbau erfolgt aber nicht auf der live
laufenden Seite.
