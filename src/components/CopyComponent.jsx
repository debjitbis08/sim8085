import { createSignal } from "solid-js";
import { VsCopy } from "solid-icons/vs";
import { FaSolidCheck } from "solid-icons/fa";
import { HiSolidCheckCircle } from "solid-icons/hi";

function CopyComponent(props) {
  const [copied, setCopied] = createSignal(false);

  const copyOutputAsText = () => {
    navigator.clipboard.writeText(props.getTextToCopy())
      .then(() => {
        setCopied(true); // Set copied to true
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => console.error("Copy failed: ", err));
  };

  return (
    <button class="relative" onClick={() => copyOutputAsText()}>
      {copied() ? (
        <span class="flex items-center gap-2 text-terminal">
          <HiSolidCheckCircle />
          <span>Copied</span>
        </span>
      ) : (
        <VsCopy />
      )}
    </button>
  );
}

export default CopyComponent;
