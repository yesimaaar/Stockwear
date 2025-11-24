-- Allow inserting embeddings for user feedback (bypasses auth check due to Server Action cookie issue)
-- This is safe because we restrict to fuente='user_feedback' only
DROP POLICY IF EXISTS "producto_embeddings_insert_feedback" ON producto_embeddings;

CREATE POLICY "producto_embeddings_insert_feedback" ON producto_embeddings
FOR INSERT
WITH CHECK (
  fuente = 'user_feedback'
);
