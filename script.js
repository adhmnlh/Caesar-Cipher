/**
 * script.js — Caesar Cipher Encryptor
 *
 * Implements the classic Caesar cipher for text, with optional UTF-8
 * binary input and output conversion.
 *
 * Only alphabetical characters (A-Z, a-z) are shifted.
 * Digits, spaces, punctuation, and symbols are preserved as-is. Binary
 * values are decoded to UTF-8 before ciphering and encoded after ciphering.
 */

"use strict";

/* ============================================================
   DOM References
   ============================================================ */
const inputText      = document.getElementById("inputText");
const inputFormat    = document.getElementById("inputFormat");
const outputFormat   = document.getElementById("outputFormat");
const inputHint      = document.getElementById("inputHint");
const swapFormatsBtn = document.getElementById("swapFormatsBtn");
const shiftKeyInput  = document.getElementById("shiftKey");
const encryptBtn     = document.getElementById("encryptBtn");
const decryptBtn     = document.getElementById("decryptBtn");
const clearBtn       = document.getElementById("clearBtn");
const copyBtn        = document.getElementById("copyBtn");
const copyLabel      = document.getElementById("copyLabel");
const outputText     = document.getElementById("outputText");
const operationBadge = document.getElementById("operationBadge");
const badgeLabel     = document.getElementById("badgeLabel");

/* ============================================================
   Caesar Cipher Core Algorithm
   ============================================================ */

/**
 * Applies the Caesar cipher to a single character.
 *
 * @param {string} char  - A single character to transform.
 * @param {number} shift - Number of positions to shift (positive = forward).
 * @returns {string}       The shifted character (or the original if not alpha).
 */
function shiftChar(char, shift) {
  const code = char.charCodeAt(0);

  // Uppercase letters: ASCII range 65 ('A') – 90 ('Z')
  if (code >= 65 && code <= 90) {
    // Subtract 'A' to get 0-based index, apply shift with wrap-around, add 'A' back
    return String.fromCharCode(((code - 65 + shift) % 26 + 26) % 26 + 65);
  }

  // Lowercase letters: ASCII range 97 ('a') – 122 ('z')
  if (code >= 97 && code <= 122) {
    // Same formula using 'a' (97) as the base
    return String.fromCharCode(((code - 97 + shift) % 26 + 26) % 26 + 97);
  }

  // Non-alphabetic characters (spaces, digits, symbols) — return unchanged
  return char;
}

/**
 * Runs the Caesar cipher over an entire string.
 *
 * @param {string}  text      - The full input string.
 * @param {number}  shift     - Shift amount.
 * @param {boolean} [decrypt] - If true, reverses the shift (decryption).
 * @returns {string}            The resulting encrypted or decrypted string.
 */
function caesarCipher(text, shift, decrypt = false) {
  // Normalise shift to 0-25; negate for decryption
  const normalised = decrypt ? -shift : shift;

  let result = "";

  // Iterate over each character and apply the shift
  for (let i = 0; i < text.length; i++) {
    result += shiftChar(text[i], normalised);
  }

  return result;
}

/* ============================================================
   Validation Helper
   ============================================================ */

/**
 * Reads and validates the current input values.
 * Highlights invalid fields and returns null on failure.
 *
 * @returns {{ text: string, shift: number } | null}
 */
function getValidInputs() {
  const text  = inputText.value;
  const shift = Number(shiftKeyInput.value);

  // Check: message must not be empty
  if (text.trim() === "") {
    flashInvalid(inputText, "Please enter a message.");
    return null;
  }

  // Check: shift must be a number in [1, 25]
  if (!Number.isInteger(shift) || shift < 1 || shift > 25) {
    flashInvalid(shiftKeyInput, "Shift key must be between 1 and 25.");
    return null;
  }

  let decodedText = text;

  if (inputFormat.value === "binary") {
    const bits = text.replace(/\s/g, "");
    if (!/^[01]+$/.test(bits) || bits.length % 8 !== 0) {
      flashInvalid(inputText, "Enter binary as complete 8-bit bytes (0 and 1 only).");
      return null;
    }

    const bytes = new Uint8Array(bits.match(/.{8}/g).map((byte) => parseInt(byte, 2)));
    try {
      decodedText = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch (error) {
      if (error instanceof TypeError || (error && error.name === "TypeError")) {
        flashInvalid(inputText, "Binary input is not valid UTF-8 text.");
        return null;
      }
      throw error;
    }
  }

  return { text: decodedText, shift };
}

/**
 * Briefly highlights an input element in red with an error message,
 * then restores it after a short delay.
 *
 * @param {HTMLElement} element - The input to flash.
 * @param {string}      message - Tooltip / title message.
 */
function flashInvalid(element, message) {
  element.classList.add("border-red-500", "focus:border-red-500");
  element.title = message;
  element.focus();

  setTimeout(() => {
    element.classList.remove("border-red-500", "focus:border-red-500");
    element.title = "";
  }, 2000);
}

/* ============================================================
   Output Rendering
   ============================================================ */

/**
 * Renders the cipher result into the output area and updates
 * the operation badge.
 *
 * @param {string}  result    - The processed text to display.
 * @param {boolean} isEncrypt - True for encrypt mode, false for decrypt.
 */
function renderOutput(result, isEncrypt) {
  const formattedResult = outputFormat.value === "binary"
    ? Array.from(new TextEncoder().encode(result), (byte) => byte.toString(2).padStart(8, "0")).join(" ")
    : result;

  // Display the result
  outputText.textContent = formattedResult;
  outputText.classList.add("has-result", "animate-fade-in-up");

  // Remove animation class after it plays so it can re-trigger next time
  outputText.addEventListener(
    "animationend",
    () => outputText.classList.remove("animate-fade-in-up"),
    { once: true }
  );

  // Show the operation badge
  operationBadge.classList.remove("hidden");
  badgeLabel.className = "inline-block text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full";

  if (isEncrypt) {
    badgeLabel.classList.add("badge-encrypt");
    badgeLabel.textContent = "⟳ Encrypted  |  Shift +" + shiftKeyInput.value + "  |  " + outputFormat.options[outputFormat.selectedIndex].text;
  } else {
    badgeLabel.classList.add("badge-decrypt");
    badgeLabel.textContent = "⟲ Decrypted  |  Shift -" + shiftKeyInput.value + "  |  " + outputFormat.options[outputFormat.selectedIndex].text;
  }

  // Enable the copy button
  copyBtn.disabled = false;
  resetCopyLabel();
}

/* ============================================================
   Copy to Clipboard
   ============================================================ */

/**
 * Resets the copy button label back to its default state.
 */
function resetCopyLabel() {
  copyLabel.textContent = "Copy";
}

/**
 * Copies the output text to the clipboard and gives visual feedback.
 */
function copyToClipboard() {
  const text = outputText.textContent;

  if (!text || text === "Your result will appear here…") return;

  navigator.clipboard
    .writeText(text)
    .then(() => {
      copyLabel.textContent = "Copied!";
      // Reset label after 2 seconds
      setTimeout(resetCopyLabel, 2000);
    })
    .catch(() => {
      copyLabel.textContent = "Failed";
      setTimeout(resetCopyLabel, 2000);
    });
}

/* ============================================================
   Clear All Fields
   ============================================================ */

/**
 * Resets all input fields and clears the output area.
 */
function clearAll() {
  inputText.value         = "";
  inputFormat.value       = "text";
  outputFormat.value      = "text";
  shiftKeyInput.value     = "3";
  outputText.textContent  = "Your result will appear here…";
  outputText.classList.remove("has-result", "animate-fade-in-up");

  operationBadge.classList.add("hidden");
  badgeLabel.textContent = "";

  copyBtn.disabled = true;
  resetCopyLabel();
  updateInputHint();

  inputText.focus();
}

function updateInputHint() {
  const isBinary = inputFormat.value === "binary";
  inputText.placeholder = isBinary
    ? "Paste binary bytes, e.g. 01001000 01101001…"
    : "Type your message here…";
  inputHint.textContent = isBinary
    ? "Binary input must be valid UTF-8 in complete 8-bit bytes, separated by spaces or entered continuously."
    : "Text input supports standard text; only A–Z and a–z are shifted.";
}

updateInputHint();

/* ============================================================
   Event Listeners
   ============================================================ */

// Encrypt button
encryptBtn.addEventListener("click", () => {
  const inputs = getValidInputs();
  if (!inputs) return;

  const encrypted = caesarCipher(inputs.text, inputs.shift, false);
  renderOutput(encrypted, true);
});

// Decrypt button
decryptBtn.addEventListener("click", () => {
  const inputs = getValidInputs();
  if (!inputs) return;

  const decrypted = caesarCipher(inputs.text, inputs.shift, true);
  renderOutput(decrypted, false);
});

// Clear button
clearBtn.addEventListener("click", clearAll);

inputFormat.addEventListener("change", updateInputHint);

swapFormatsBtn.addEventListener("click", () => {
  const currentInputFormat = inputFormat.value;
  inputFormat.value = outputFormat.value;
  outputFormat.value = currentInputFormat;
  updateInputHint();
});

// Copy button
copyBtn.addEventListener("click", copyToClipboard);

// Allow Ctrl+Enter / Cmd+Enter in the textarea to trigger Encrypt
inputText.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    encryptBtn.click();
  }
});
