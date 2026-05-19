ALTER TABLE "public"."files"
  ADD COLUMN IF NOT EXISTS "content_hash" TEXT,
  ADD COLUMN IF NOT EXISTS "indexing_status" TEXT NOT NULL DEFAULT 'uploaded',
  ADD COLUMN IF NOT EXISTS "indexing_error" TEXT,
  ADD COLUMN IF NOT EXISTS "indexed_at" TIMESTAMPTZ(6);

ALTER TABLE "public"."document_contents"
  ADD COLUMN IF NOT EXISTS "page_number" INTEGER,
  ADD COLUMN IF NOT EXISTS "section" TEXT,
  ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'extracted';

CREATE UNIQUE INDEX IF NOT EXISTS "document_contents_file_id_chunk_index_key"
  ON "public"."document_contents"("file_id", "chunk_index");

CREATE INDEX IF NOT EXISTS "document_contents_file_id_page_number_idx"
  ON "public"."document_contents"("file_id", "page_number");
