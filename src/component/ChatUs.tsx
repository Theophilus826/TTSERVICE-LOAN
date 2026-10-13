export default function ChatUs() {
  const handleChatUs = () => {
    window.open(
      "https://face-rite.onrender.com/group",
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div className="fixed bottom-8 right-4 z-50 flex flex-col items-center gap-1">
      <span className="text-xs font-semibold text-[#D4AF37] animate-pulse">
        Chat Us
      </span>

      <button
        type="button"
        onClick={handleChatUs}
        className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full shadow-md transition hover:scale-110"
        aria-label="Chat Us"
        title="Chat Us"
      >
        <img
          src="/splash.png"
          alt="Chat Us"
          className="h-full w-full object-contain"
        />
      </button>
    </div>
  );
}
