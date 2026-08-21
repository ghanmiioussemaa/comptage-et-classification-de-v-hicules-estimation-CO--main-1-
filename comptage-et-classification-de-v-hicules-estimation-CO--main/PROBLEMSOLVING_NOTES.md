# Rapport de Correction - Problème d'Affichage de l'Analyse Vidéo

## Problèmes Identifiés

### 1. **Typo dans VideoUploader.jsx (ligne 22)**
- **Problème** : La fonction `up(file)` n'existe pas. Elle aurait dû être `uploadVideo(file)`.
- **Impact** : Cette typo causait une erreur JavaScript qui arrêtait complètement le flux d'analyse.
- **Correction** : Remplacement par `uploadVideo(file)`.

### 2. **Flux d'Analyse Incomplet**
- **Problème** : Le code supposait que la réponse de l'upload contenait directement les résultats d'analyse (`data.counts`, `data.co2`).
- **Réalité** : L'upload retourne seulement une `session_id` et lance l'analyse en arrière-plan. Les résultats doivent être récupérés ultérieurement après la fin du traitement.
- **Correction** : Ajout d'un polling sur `/api/video/status/{session_id}` pour attendre la fin de l'analyse, puis récupération des résultats via `/api/video/results/{session_id}`.

### 3. **Transformation Incorrecte des Données**
- **Problème** : Le code essayait d'accéder à des champs qui n'existaient pas dans la réponse JSON du serveur.
- **Correction** : Mise à jour du mapping pour utiliser les champs corrects retournés par `AnalysisResult`:
  - `totalVehicles` ← `co2_result.vehicle_counts` (somme)
  - `co2Total` ← `co2_result.total_kg_per_day`
  - `byType` ← construction à partir de `vehicle_counts` et `by_type`
  - `processingTime` ← `processing_time_seconds`

### 4. **Données de Graphique Fictives**
- **Problème** : Le composant `VideoAnalysis` générait des données fictives avec `Math.random()` au lieu d'utiliser les vraies données.
- **Correction** : 
  - Génération des `chartSeries` à partir des `frame_detections` retournées par le serveur
  - Utilisation des timestamps réels et des comptages de véhicules réels

## Flux Corrigé

```
1. Utilisateur sélectionne une vidéo
2. VideoUploader appelle uploadVideo(file)
3. Backend retourne session_id et lance analyse en arrière-plan
4. VideoUploader poll le statut toutes les 1s
5. Quand status = "completed", VideoUploader récupère /api/video/results/{session_id}
6. Les résultats sont transformés et passés à handleProcess()
7. VideoAnalysis affiche les résultats réels avec graphiques
```

## Fichiers Modifiés

1. **Dashboard/src/components/VideoUploader.jsx**
   - Correction de la typo `up()` → `uploadVideo()`
   - Ajout du polling sur le statut
   - Ajout de `getSessionResults()` pour récupérer les résultats complets
   - Transformation correcte des données selon le schéma `AnalysisResult`
   - Génération du `chartSeries` à partir de `frameDetections`

2. **Dashboard/src/pages/VideoAnalysis.jsx**
   - Simplification de `handleProcess()` pour utiliser les données réelles
   - Suppression de la génération fictive de données

## Données Maintenant Affichées

- ✅ Nombre total de véhicules détectés
- ✅ CO2 total émis (en kg/jour)
- ✅ Distribution par type de véhicule avec comptages et émissions
- ✅ Graphiques en temps réel (détections vs CO2)
- ✅ Temps de traitement

## Notes pour le Futur

- **avgSpeed** ne peut pas être calculé actuellement car les données de vitesse ne sont pas dans `AnalysisResult`. À ajouter si le backend les calcule.
- Le polling utilise un timeout de 2 minutes max. À adapter selon le temps réel de traitement.
- Les données `frameDetections` pourraient être utilisées pour des visualisations plus détaillées.
