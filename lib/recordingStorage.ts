/**
 * IndexedDB storage for persisting audio recordings across page refreshes
 */

const DB_NAME = "whisper-recordings";
const DB_VERSION = 1;
const RECORDING_STORE = "recordings";
const CHUNKS_STORE = "chunks";

export interface RecordingMetadata {
  id: string;
  startTime: number;
  duration: number;
  language: string;
  recordSystemAudio: boolean;
  paused: boolean;
  lastUpdate: number;
}

export interface AudioChunkData {
  recordingId: string;
  chunkIndex: number;
  blob: Blob;
  timestamp: number;
}

/**
 * Open or create the IndexedDB database
 */
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create recordings store
      if (!db.objectStoreNames.contains(RECORDING_STORE)) {
        const recordingStore = db.createObjectStore(RECORDING_STORE, {
          keyPath: "id",
        });
        recordingStore.createIndex("startTime", "startTime", { unique: false });
      }

      // Create chunks store
      if (!db.objectStoreNames.contains(CHUNKS_STORE)) {
        const chunksStore = db.createObjectStore(CHUNKS_STORE, {
          keyPath: ["recordingId", "chunkIndex"],
        });
        chunksStore.createIndex("recordingId", "recordingId", { unique: false });
      }
    };
  });
}

/**
 * Save or update recording metadata
 */
export async function saveRecordingMetadata(
  metadata: RecordingMetadata
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([RECORDING_STORE], "readwrite");
    const store = transaction.objectStore(RECORDING_STORE);
    const request = store.put(metadata);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Save an audio chunk
 */
export async function saveAudioChunk(chunk: AudioChunkData): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CHUNKS_STORE], "readwrite");
    const store = transaction.objectStore(CHUNKS_STORE);
    const request = store.put(chunk);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get the most recent recording metadata
 */
export async function getLatestRecording(): Promise<RecordingMetadata | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([RECORDING_STORE], "readonly");
    const store = transaction.objectStore(RECORDING_STORE);
    const index = store.index("startTime");
    const request = index.openCursor(null, "prev");

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        resolve(cursor.value as RecordingMetadata);
      } else {
        resolve(null);
      }
    };
  });
}

/**
 * Get all chunks for a recording
 */
export async function getRecordingChunks(
  recordingId: string
): Promise<Blob[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CHUNKS_STORE], "readonly");
    const store = transaction.objectStore(CHUNKS_STORE);
    const index = store.index("recordingId");
    const request = index.getAll(recordingId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const chunks = (request.result as AudioChunkData[])
        .sort((a, b) => a.chunkIndex - b.chunkIndex)
        .map((chunk) => chunk.blob);
      resolve(chunks);
    };
  });
}

/**
 * Delete a recording and all its chunks
 */
export async function deleteRecording(recordingId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      [RECORDING_STORE, CHUNKS_STORE],
      "readwrite"
    );

    // Delete recording metadata
    const recordingStore = transaction.objectStore(RECORDING_STORE);
    recordingStore.delete(recordingId);

    // Delete all chunks
    const chunksStore = transaction.objectStore(CHUNKS_STORE);
    const index = chunksStore.index("recordingId");
    const request = index.openCursor(recordingId);

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => resolve();
  });
}

/**
 * Delete all recordings older than the specified time
 */
export async function deleteOldRecordings(
  olderThanMs: number = 24 * 60 * 60 * 1000
): Promise<void> {
  const db = await openDB();
  const cutoffTime = Date.now() - olderThanMs;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([RECORDING_STORE], "readonly");
    const store = transaction.objectStore(RECORDING_STORE);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = async () => {
      const recordings = request.result as RecordingMetadata[];
      const oldRecordings = recordings.filter(
        (r) => r.lastUpdate < cutoffTime
      );

      // Delete each old recording
      for (const recording of oldRecordings) {
        await deleteRecording(recording.id);
      }
      resolve();
    };
  });
}

/**
 * Check if there's a recording in progress
 */
export async function hasActiveRecording(): Promise<boolean> {
  const recording = await getLatestRecording();
  if (!recording) return false;

  // Consider a recording active if it was updated in the last 5 minutes
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  return recording.lastUpdate > fiveMinutesAgo;
}
