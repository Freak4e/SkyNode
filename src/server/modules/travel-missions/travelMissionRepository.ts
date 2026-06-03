import { ensureSchema } from "../../infrastructure/database/schema.js";
import { query } from "../../infrastructure/database/client.js";
import type { TravelMissionUnlock, TravelMissionValidation } from "../../../shared/types.js";

type UnlockRow = {
  id: string;
  user_id: string;
  country_code: string;
  country_name: string;
  confidence: string | number;
  face_detected: boolean;
  landmark_detected: boolean;
  gesture_detected: boolean;
  summary: string | null;
  created_at: string;
};

export async function listTravelMissionUnlocks(userId: string): Promise<TravelMissionUnlock[]> {
  await ensureSchema();

  const result = await query<UnlockRow>(
    `select id, user_id, country_code, country_name, confidence, face_detected, landmark_detected,
      gesture_detected, summary, created_at
     from travel_mission_unlocks
     where user_id = $1
     order by created_at desc`,
    [userId],
  );

  return result.rows.map(mapUnlockRow);
}

export async function countTravelMissionUnlocks(userId: string): Promise<number> {
  await ensureSchema();

  const result = await query<{ count: string }>(
    "select count(*)::text as count from travel_mission_unlocks where user_id = $1",
    [userId],
  );

  return Number(result.rows[0]?.count || 0);
}

export async function saveTravelMissionUnlock(input: {
  countryCode: string;
  countryName: string;
  userId: string;
  validation: TravelMissionValidation;
}): Promise<TravelMissionUnlock> {
  await ensureSchema();

  const result = await query<UnlockRow>(
    `insert into travel_mission_unlocks (
      user_id, country_code, country_name, confidence, face_detected, landmark_detected,
      gesture_detected, summary, evidence
    ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    on conflict (user_id, country_code) do update set
      confidence = greatest(travel_mission_unlocks.confidence, excluded.confidence),
      face_detected = travel_mission_unlocks.face_detected or excluded.face_detected,
      landmark_detected = travel_mission_unlocks.landmark_detected or excluded.landmark_detected,
      gesture_detected = travel_mission_unlocks.gesture_detected or excluded.gesture_detected,
      summary = excluded.summary,
      evidence = excluded.evidence
    returning id, user_id, country_code, country_name, confidence, face_detected, landmark_detected,
      gesture_detected, summary, created_at`,
    [
      input.userId,
      input.countryCode,
      input.countryName,
      input.validation.confidence,
      input.validation.faceDetected,
      input.validation.landmarkDetected,
      input.validation.gestureDetected,
      input.validation.summary,
      input.validation,
    ],
  );

  return mapUnlockRow(result.rows[0]);
}

function mapUnlockRow(row: UnlockRow): TravelMissionUnlock {
  return {
    id: row.id,
    userId: row.user_id,
    countryCode: row.country_code,
    countryName: row.country_name,
    confidence: Number(row.confidence || 0),
    faceDetected: row.face_detected,
    landmarkDetected: row.landmark_detected,
    gestureDetected: row.gesture_detected,
    summary: row.summary || undefined,
    createdAt: row.created_at,
  };
}
