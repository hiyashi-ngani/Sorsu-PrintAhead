import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateSorSUEmail,
  generateReferenceNumber,
  isValidReferenceNumber,
  canStudentCancelRequest,
  validatePrintPrice,
  canRunnerAcceptJob,
  canCompleteRequest,
  canSubmitPrintRequest,
  canAcceptDeliveryJob,
  canManagePrintingShop,
  canAccessAdmin,
  buildPrintInstructionMessage,
  validatePrintRequestInput,
  DEFAULT_PRINT_PREFERENCES,
  DEMO_ACCOUNT_CREDENTIALS,
  verifyDemoCredentialPassword,
  isAuthorizedSorSUGoogleAccount,
  SIGNUP_ROLES,
  sanitizeSelfRegistrationRole,
} from './rules.ts';

test('SorSU email validation accepts valid student/staff emails', () => {
  assert.equal(validateSorSUEmail('juan.delacruz@sorsu.edu.ph'), true);
  assert.equal(validateSorSUEmail('printshop@sorsu.edu.ph'), true);
  assert.equal(validateSorSUEmail('runner.maria@bulan.sorsu.edu.ph'), true);
  // Invalid non-institutional emails
  assert.equal(validateSorSUEmail('student@gmail.com'), false);
  assert.equal(validateSorSUEmail('student@yahoo.com'), false);
  assert.equal(validateSorSUEmail(''), false);
});

test('Demo account credentials cover Student 1, Student 2, Printing Shop, and Admin with password verification', () => {
  assert.equal(DEMO_ACCOUNT_CREDENTIALS.length, 4);
  const labels = DEMO_ACCOUNT_CREDENTIALS.map((c) => c.label);
  assert.deepEqual(labels, ['Student 1', 'Student 2', 'Printing Shop', 'Admin']);

  for (const cred of DEMO_ACCOUNT_CREDENTIALS) {
    assert.equal(validateSorSUEmail(cred.email), true);
    assert.equal(verifyDemoCredentialPassword(cred.email, cred.password).valid, true);
    assert.equal(verifyDemoCredentialPassword(cred.email, 'wrong-pass').valid, false);
    assert.equal(verifyDemoCredentialPassword(cred.email, '').valid, false);
  }
});

test('Google sign-in authorization accepts only @sorsu.edu.ph emails', () => {
  assert.equal(isAuthorizedSorSUGoogleAccount('student@sorsu.edu.ph'), true);
  assert.equal(isAuthorizedSorSUGoogleAccount('JUAn.DelaCruz@SORSU.EDU.PH'), true);
  assert.equal(isAuthorizedSorSUGoogleAccount('user@gmail.com'), false);
  assert.equal(isAuthorizedSorSUGoogleAccount('user@sorsu.edu.ph.evil.com'), false);
  assert.equal(isAuthorizedSorSUGoogleAccount(null), false);
});

test('Self-registration roles exclude admin and sanitize requested roles', () => {
  const values = SIGNUP_ROLES.map((r) => r.value);
  assert.deepEqual(values, ['student', 'print_shop_staff']);
  assert.equal(values.includes('admin' as never), false);
  assert.equal(sanitizeSelfRegistrationRole('student'), 'student');
  assert.equal(sanitizeSelfRegistrationRole('print_shop_staff'), 'print_shop_staff');
  assert.equal(sanitizeSelfRegistrationRole('admin'), 'student');
  assert.equal(sanitizeSelfRegistrationRole(undefined), 'student');
});

test('Reference number follows official format PR-YYYY-XXXXX', () => {
  const ref = generateReferenceNumber('12345');
  assert.equal(ref, 'PR-2026-12345');
  assert.equal(isValidReferenceNumber(ref), true);
  assert.equal(isValidReferenceNumber('INVALID-123'), false);
});

test('Student can only cancel requests before printing starts and must be owner', () => {
  const studentId = 'student-101';
  const otherStudentId = 'student-999';

  // Owner, pending review -> CAN CANCEL
  const res1 = canStudentCancelRequest({ studentId, status: 'Pending Review' }, studentId);
  assert.equal(res1.canCancel, true);

  // Owner, reviewed / awaiting payment -> CAN CANCEL
  const res2 = canStudentCancelRequest({ studentId, status: 'Reviewed / Awaiting Payment' }, studentId);
  assert.equal(res2.canCancel, true);

  // Owner, already printing -> CANNOT CANCEL
  const res3 = canStudentCancelRequest({ studentId, status: 'Printing' }, studentId);
  assert.equal(res3.canCancel, false);
  assert.match(res3.reason || '', /Printing has already started/);

  // Owner, ready for delivery -> CANNOT CANCEL
  const res4 = canStudentCancelRequest({ studentId, status: 'Ready for Delivery' }, studentId);
  assert.equal(res4.canCancel, false);

  // Non-owner -> CANNOT CANCEL
  const res5 = canStudentCancelRequest({ studentId, status: 'Pending Review' }, otherStudentId);
  assert.equal(res5.canCancel, false);
  assert.match(res5.reason || '', /Only the request owner/);
});

test('Print price validation enforces positive cash amount', () => {
  assert.equal(validatePrintPrice('25.50').valid, true);
  assert.equal(validatePrintPrice('25.50').parsedAmount, 25.5);

  // Negative or zero
  assert.equal(validatePrintPrice('0').valid, false);
  assert.equal(validatePrintPrice('-10').valid, false);
  assert.equal(validatePrintPrice('abc').valid, false);

  // Max limit safeguard
  assert.equal(validatePrintPrice('10000').valid, false);
});

test('Runner or Student can accept unclaimed Ready for Delivery jobs from other students only', () => {
  assert.equal(canRunnerAcceptJob({ status: 'Ready for Delivery', runnerId: null }), true);
  assert.equal(
    canRunnerAcceptJob({ status: 'Ready for Delivery', runnerId: null, studentId: 'student-2' }, 'student-1'),
    true
  );
  // Cannot accept own print request
  assert.equal(
    canRunnerAcceptJob({ status: 'Ready for Delivery', runnerId: null, studentId: 'student-1' }, 'student-1'),
    false
  );
  assert.equal(canRunnerAcceptJob({ status: 'Ready for Delivery', runnerId: 'runner-1' }), false);
  assert.equal(canRunnerAcceptJob({ status: 'Printing', runnerId: null }), false);
});

test('Role capability matrix isolates Admin, Printing Shop, and combined Student+Runner permissions', () => {
  // Combined Student + Runner can both send and accept requests
  assert.equal(canSubmitPrintRequest('student'), true);
  assert.equal(canSubmitPrintRequest('student_runner'), true);
  assert.equal(canAcceptDeliveryJob('student'), true);
  assert.equal(canAcceptDeliveryJob('student_runner'), true);

  // Admin & Print Shop do not send/accept via Student+Runner portal
  assert.equal(canSubmitPrintRequest('print_shop_staff'), false);
  assert.equal(canSubmitPrintRequest('admin'), false);
  assert.equal(canAcceptDeliveryJob('print_shop_staff'), false);
  assert.equal(canAcceptDeliveryJob('admin'), false);

  // Printing Shop & Admin isolation
  assert.equal(canManagePrintingShop('print_shop_staff'), true);
  assert.equal(canManagePrintingShop('student'), false);
  assert.equal(canManagePrintingShop('admin'), false);

  assert.equal(canAccessAdmin('admin'), true);
  assert.equal(canAccessAdmin('print_shop_staff'), false);
  assert.equal(canAccessAdmin('student'), false);
  assert.equal(canAccessAdmin('student_runner'), false);
});

test('Completed status requires both delivery and cash payment confirmation', () => {
  assert.equal(canCompleteRequest(false, false), false);
  assert.equal(canCompleteRequest(true, false), false);
  assert.equal(canCompleteRequest(false, true), false);
  assert.equal(canCompleteRequest(true, true), true);
});

test('buildPrintInstructionMessage formats preferences and custom notes', () => {
  const defaultMsg = buildPrintInstructionMessage(DEFAULT_PRINT_PREFERENCES);
  assert.equal(
    defaultMsg,
    '[Specs: 1 copy | Short (8.5" x 11") | Black & White | Single-Sided]'
  );

  const customMsg = buildPrintInstructionMessage(
    {
      copies: 3,
      paperSize: 'A4 (8.27" x 11.69")',
      colorMode: 'Full Color',
      sides: 'Double-Sided',
      finishing: 'Stapled (Top-Left)',
    },
    'Urgent for 2:00 PM lab.'
  );
  assert.equal(
    customMsg,
    '[Specs: 3 copies | A4 (8.27" x 11.69") | Full Color | Double-Sided | Stapled (Top-Left)] Urgent for 2:00 PM lab.'
  );
});

test('validatePrintRequestInput enforces required fields and file limits', () => {
  assert.equal(
    validatePrintRequestInput({
      fullName: 'Juan Dela Cruz',
      roomNumber: 'Room 304, IT Building',
      copies: 2,
      hasFile: true,
      fileSizeBytes: 1024 * 500,
    }).valid,
    true
  );

  assert.equal(
    validatePrintRequestInput({
      fullName: '',
      roomNumber: 'Room 304',
      copies: 1,
      hasFile: true,
    }).valid,
    false
  );

  assert.equal(
    validatePrintRequestInput({
      fullName: 'Juan',
      roomNumber: '   ',
      copies: 1,
      hasFile: true,
    }).valid,
    false
  );

  assert.equal(
    validatePrintRequestInput({
      fullName: 'Juan',
      roomNumber: 'Room 101',
      copies: 0,
      hasFile: true,
    }).valid,
    false
  );

  assert.equal(
    validatePrintRequestInput({
      fullName: 'Juan',
      roomNumber: 'Room 101',
      copies: 1,
      hasFile: false,
    }).valid,
    false
  );
});
