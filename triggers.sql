-- Triggers -------------------------------------------------------

CREATE OR REPLACE FUNCTION notify_new_thread()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify(
    'new_thread',
    json_build_object(
      'operation', TG_OP,
      'record', row_to_json(NEW)
    )::text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER new_thread
AFTER INSERT
ON threads
FOR EACH ROW
EXECUTE PROCEDURE notify_new_thread();
