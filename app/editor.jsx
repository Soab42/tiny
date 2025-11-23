

"use client";
import { useRef, useEffect, useState, useMemo } from "react";
import { Editor } from "@tinymce/tinymce-react";

export default function TinyEditor({
  value,
  onChange,
  disabled = false,
  type,
}) {
  const editorRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [signatureOptions, setSignatureOptions] = useState([]);
  const [selectedSignature, setSelectedSignature] = useState("no-signature");
  const [showSignatureDropdown, setShowSignatureDropdown] = useState(false);
  const [signatureButtonRect, setSignatureButtonRect] =
    useState(null);
  const dropdownRef = useRef(null);
  const signatureButtonRef = useRef(null);
  const isProcessingClickRef = useRef(false);

  useEffect(() => {
    const checkTinyMCELoaded = () => {
      if (typeof window !== "undefined" && window.tinymce) {
        setIsLoading(false);
        return true;
      }
      return false;
    };

    if (checkTinyMCELoaded()) return;

    const maxAttempts = 50;
    let attempts = 0;

    const interval = setInterval(() => {
      attempts++;
      if (checkTinyMCELoaded() || attempts >= maxAttempts) {
        clearInterval(interval);
        if (attempts >= maxAttempts) setIsLoading(false);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Find signature button in the DOM after editor loads
  useEffect(() => {
    if (!isLoading && editorRef.current && type !== "sms") {
      const findSignatureButton = () => {
        const buttons = document.querySelectorAll(".tox-toolbar .tox-tbtn");
        buttons.forEach((button) => {
          if (button.getAttribute("aria-label") === "Insert Signature") {
            signatureButtonRef.current = button;
          }
        });
      };

      // Try to find the button after a short delay
      setTimeout(findSignatureButton, 100);
    }
  }, [isLoading, type]);

  // Update signature button position when dropdown is shown
  useEffect(() => {
    if (showSignatureDropdown && type !== "sms") {
      // Try to find the button if not already found
      if (!signatureButtonRef.current) {
        const buttons = document.querySelectorAll(".tox-toolbar .tox-tbtn");
        buttons.forEach((button) => {
          if (button.getAttribute("aria-label") === "Insert Signature") {
            signatureButtonRef.current = button;
          }
        });
      }

      if (signatureButtonRef.current) {
        const rect = signatureButtonRef.current.getBoundingClientRect();
        setSignatureButtonRect(rect);
      }
    }
  }, [showSignatureDropdown, type]);

  // Close dropdown when clicking outside - Fixed version
  useEffect(() => {
    const handleClickOutside = (event) => {
      // If we're currently processing a click from the signature button, skip this
      if (isProcessingClickRef.current) {
        isProcessingClickRef.current = false;
        return;
      }

      // Check if click is outside dropdown AND outside signature button
      const isOutsideDropdown =
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target);

      const isOutsideSignatureButton =
        signatureButtonRef.current &&
        !signatureButtonRef.current.contains(event.target);

      if (isOutsideDropdown && isOutsideSignatureButton) {
        setShowSignatureDropdown(false);
      }
    };

    if (showSignatureDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showSignatureDropdown]);

  useEffect(() => {
    async function loadSignatures() {
      const data = await getUserSignature();
      console.log('signatures', data);
      // 1. Safely access the property
      const signaturesObj = data?.data?.signatures;

      // 2. Check if it is a valid Object (Not null, Not Array, is type object)
      const isValidObject = signaturesObj
        && typeof signaturesObj === 'object'
        && !Array.isArray(signaturesObj);

      let signaturesArray = [];

      if (isValidObject) {
        // 3. Perform the conversion
        signaturesArray = Object.entries(signaturesObj).map(([key, value], i) => ({
          id: i + 1,
          name: key,
          content: value
        }));

        console.log("Success:", signaturesArray);
        setSignatureOptions(signaturesArray);
      } else {
        console.error("Error: 'signatures' is missing or not a valid object.");
      }

    }
    loadSignatures();
  }, [])
  // Toggle signature dropdown
  const toggleSignatureDropdown = () => {
    isProcessingClickRef.current = true;
    setShowSignatureDropdown((prev) => !prev);

    // Reset the flag after a short delay
    setTimeout(() => {
      isProcessingClickRef.current = false;
    }, 0);
  };

  // Handle signature selection
  const handleSignatureChange = (signatureId) => {
    setSelectedSignature(signatureId);
    setShowSignatureDropdown(false);

    if (editorRef.current) {
      const editor = editorRef.current;

      // Remove existing signature if any
      let content = value;
      signatureOptions.forEach((sig) => {
        if (sig.content && content.includes(sig.content)) {
          content = content.replace(sig.content, "");
        }
      });

      // Add new signature if not "No Signature"
      const selectedSig = signatureOptions.find(
        (sig) => sig.id === signatureId
      );
      if (selectedSig && selectedSig.content) {
        content += selectedSig.content;

        // Set cursor at the end of the content
        editor.setContent(content);
        editor.selection.select(editor.getBody(), true);
        editor.selection.collapse(false);
      } else {
        editor.setContent(content);
      }

      onChange(content);
    }
  };

  // Generate toolbar dynamically based on editor type
  const toolbar = useMemo(() => {
    const base = [
      "undo redo print",
      "fontfamily fontsize",
      "formatselect",
      "bold italic underline",
      "forecolor backcolor",
      "alignleft aligncenter alignright alignjustify",
      "bullist numlist outdent indent",
      "link image",
      "blockquote",
      "removeformat",
    ];

    switch (type) {
      case "sms":
        return [...base].join(" | ");
      case "email":
        return [...base, "signature"].join(" | ");
      default:
        return [...base].join(" | ");
    }
  }, [type]);

  if (isLoading) {
    return (
      <div className="h-80 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600 text-sm">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tiny-editor-wrapper rounded-lg overflow-hidden relative">
      {/* TinyMCE Editor */}
      <Editor
        apiKey="pe4jg2cro66y08zoltl894fxxqlrrzr2ddn0iqwl7y9w1o0a"
        value={value}
        disabled={disabled}
        onInit={(_evt, editor) => {
          editorRef.current = editor ?? null;

          // Fix for z-index issues
          editor.on("focus", () => {
            document.querySelectorAll(".tox-tinymce-aux").forEach((element) => {
              element.style.zIndex = "999999";
            });
          });
        }}
        onEditorChange={(content) => onChange(content)}
        init={{
          height: type === "sms" ? 300 : 440,
          menubar: false,
          plugins:
            type === "sms"
              ? ["lists", "link", "wordcount"]
              : [
                "advlist",
                "autolink",
                "lists",
                "link",
                "image",
                "charmap",
                "preview",
                "anchor",
                "searchreplace",
                "visualblocks",
                "code",
                "fullscreen",
                "insertdatetime",
                "media",
                "table",
                "wordcount",
                "textcolor",
              ],
          toolbar: toolbar,
          // toolbar: getToolbar(),
          statusbar: false,
          content_style: `
            body { 
              font-family: sans-serif,-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,; 
              font-size: 14px; 
              line-height: 1.6;
              margin: 16px;
              color: #020303;
            }
          `,
          placeholder:
            type === "sms" ? "Write your SMS message..." : "Write a message...",
          zIndex: 999999,
          branding: false,
          promotion: false,
          toolbar_mode: "wrap",
          setup: (editor) => {
            // Only add signature button for non-SMS types
            if (type !== "sms") {
              editor.ui.registry.addButton("signature", {
                icon: "signature-custom",
                tooltip: "Insert Signature",
                onAction: toggleSignatureDropdown,
              });

              // Add custom icon
              editor.ui.registry.addIcon(
                "signature-custom",
                `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M0.801758 20V19.3005H19.1975V20H0.801758ZM18.3372 3.4438L12.2449 9.53609L9.74085 7.03203L16.0779 0.694924C16.0849 0.680935 16.0989 0.67394 16.1059 0.659951C16.8054 -0.0395084 17.9385 -0.0395084 18.638 0.659951C19.3374 1.35941 19.3374 2.49253 18.638 3.19199C18.554 3.28992 18.4491 3.37385 18.3372 3.4438ZM8.47483 7.03203C9.39112 6.05278 13.448 1.48531 14.0845 0.785854C14.721 0.0863942 15.4764 -0.228362 15.7632 0.184319C15.2876 0.659951 8.03417 7.92034 8.03417 7.92034C8.03417 7.92034 7.55154 8.01127 8.47483 7.03203ZM11.4825 9.72494L4.66977 16.5377L2.76724 14.6351L9.57997 7.82241L11.4825 9.72494ZM3.69052 17.5169L0.801758 18.5661L1.781 15.6214L2.25663 15.1458L4.15916 17.0483L3.69052 17.5169Z" fill="#515151"/>
                </svg>`
              );
            }

            // Add custom formatting options if needed
            editor.ui.registry.addButton("customblockquote", {
              icon: "blockquote",
              tooltip: "Blockquote",
              onAction: () => {
                editor.execCommand("mceToggleFormat", false, "blockquote");
              },
            });
          },
        }}
      />

      {/* Signature Dropdown - Only show for non-SMS types */}
      {showSignatureDropdown && signatureButtonRect && type !== "sms" && (
        <div
          ref={dropdownRef}
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[1000000] overflow-hidden"
          style={{
            top: signatureButtonRect.bottom + window.scrollY + 5,
            left: signatureButtonRect.left + window.scrollX - 70,
            minWidth: "256px",
          }}
        >
          <div className="bg-gray-50 border-b">
            <div className="px-3 py-3 text-xs font-semibold text-gray-500">
              Manage Signatures
            </div>
          </div>
          <div>
            {signatureOptions.map((signature, index) => (
              <button
                key={signature.id}
                type="button"
                onClick={() => handleSignatureChange(signature.id)}
                className={`
                  w-full text-left px-3 py-3 text-sm 
                  flex items-center justify-between
                  hover:bg-primaryLight hover:text-white
                  ${selectedSignature === signature.id
                    ? "bg-primaryLight text-white"
                    : ""
                  }
                  ${index === signatureOptions.length - 1 ? "rounded-b-lg" : ""}
                `}
              >
                {signature.name}
                {selectedSignature === signature.id && (
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Z-index fixes and custom styles */}
      <style jsx global>{`
        .tox-tinymce-aux {
          z-index: 999999 !important;
        }
        .tox-toolbar {
          z-index: 999999 !important;
        }
        .tox-menu {
          z-index: 999999 !important;
        }
        .tox-dialog {
          z-index: 999999 !important;
        }

        /* Custom styling for the editor */
        .tox-toolbar__primary {
          background: #f9fafb !important;
          border-bottom: 1px solid #e5e7eb !important;
        }

        .tox-editor-container {
          border: none !important;
        }

        .tox-tbtn {
          color: #374151 !important;
        }

        .tox-tbtn:hover {
          background: #e5e7eb !important;
        }

        /* Ensure signature button has proper spacing */
        .tox-tbtn[aria-label="Insert Signature"] {
          padding: 4px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        /* Hide the text label */
        .tox-tbtn[aria-label="Insert Signature"] .tox-tbtn__select-label {
          display: none !important;
        }

        /* Ensure custom SVG icon is visible */
        .tox-tbtn[aria-label="Insert Signature"] .tox-icon svg {
          display: block !important;
          width: 20px !important;
          height: 20px !important;
        }
      `}</style>
    </div>
  );
}
