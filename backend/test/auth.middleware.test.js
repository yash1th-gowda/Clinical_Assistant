import test from "node:test";
import assert from "node:assert/strict";
import { requireDoctor } from "../src/middlewares/auth.middleware.js";

test("requireDoctor allows an authenticated doctor", () => {
  let nextCalled = false;
  requireDoctor(
    { authRole: "doctor" },
    {},
    (error) => {
      assert.equal(error, undefined);
      nextCalled = true;
    }
  );
  assert.equal(nextCalled, true);
});

test("requireDoctor rejects a patient role", () => {
  let receivedError;
  requireDoctor(
    { authRole: "patient" },
    {},
    (error) => {
      receivedError = error;
    }
  );
  assert.equal(receivedError?.statusCode, 403);
  assert.equal(receivedError?.message, "Doctor access is required");
});

test("requireDoctor rejects a missing role", () => {
  let receivedError;
  requireDoctor({}, {}, (error) => {
    receivedError = error;
  });
  assert.equal(receivedError?.statusCode, 403);
});
