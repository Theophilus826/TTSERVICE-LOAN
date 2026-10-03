
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { startFaceVerification } from "../services/kycApi";

interface FaceVerificationStepProps {
  isVerified?: boolean;
  onVerified: () => void;
}

const FaceVerificationStep: React.FC<
  FaceVerificationStepProps
> = ({
  isVerified = false,
  onVerified,
}) => {
  const videoRef =
    useRef<HTMLVideoElement | null>(null);

  const canvasRef =
    useRef<HTMLCanvasElement | null>(null);

  const streamRef =
    useRef<MediaStream | null>(null);

  const [cameraStarted, setCameraStarted] =
    useState(false);

  const [verifying, setVerifying] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  // =========================================================
  // STOP CAMERA
  // =========================================================

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraStarted(false);
  }, []);

  // =========================================================
  // CLEANUP CAMERA WHEN COMPONENT UNMOUNTS
  // =========================================================

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => {
            track.stop();
          });

        streamRef.current = null;
      }
    };
  }, []);

  // =========================================================
  // START CAMERA
  // =========================================================

  const startCamera = async () => {
    setError(null);
    setMessage(null);

    try {
      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        throw new Error(
          "Camera access is not supported by this browser.",
        );
      }

      /*
       * Stop any existing camera stream first.
       */
      stopCamera();

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: {
              ideal: 1280,
            },
            height: {
              ideal: 720,
            },
          },
          audio: false,
        });

      streamRef.current = stream;

      if (!videoRef.current) {
        stream
          .getTracks()
          .forEach((track) => track.stop());

        streamRef.current = null;

        throw new Error(
          "Unable to initialize the camera preview.",
        );
      }

      videoRef.current.srcObject = stream;

      await videoRef.current.play();

      setCameraStarted(true);
    } catch (err: any) {
      console.error(
        "❌ CAMERA ERROR:",
        err,
      );

      /*
       * Make sure partially-created streams
       * don't remain active.
       */
      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => {
            track.stop();
          });

        streamRef.current = null;
      }

      setCameraStarted(false);

      if (
        err?.name ===
        "NotAllowedError"
      ) {
        setError(
          "Camera permission was denied. Please allow camera access and try again.",
        );

        return;
      }

      if (
        err?.name ===
        "NotFoundError"
      ) {
        setError(
          "No camera was found on this device.",
        );

        return;
      }

      if (
        err?.name ===
        "NotReadableError"
      ) {
        setError(
          "Your camera is currently being used by another application.",
        );

        return;
      }

      setError(
        err?.message ||
          "Unable to access your camera. Please allow camera permission and try again.",
      );
    }
  };

  // =========================================================
  // CAPTURE SELFIE
  // =========================================================

  const captureSelfie =
    (): Promise<Blob | null> => {
      return new Promise((resolve) => {
        const video =
          videoRef.current;

        const canvas =
          canvasRef.current;

        if (!video || !canvas) {
          resolve(null);
          return;
        }

        if (
          video.readyState <
          HTMLMediaElement.HAVE_CURRENT_DATA
        ) {
          resolve(null);
          return;
        }

        if (
          video.videoWidth === 0 ||
          video.videoHeight === 0
        ) {
          resolve(null);
          return;
        }

        canvas.width =
          video.videoWidth;

        canvas.height =
          video.videoHeight;

        const context =
          canvas.getContext("2d");

        if (!context) {
          resolve(null);
          return;
        }

        /*
         * Mirror the selfie so the captured image
         * looks natural to the user.
         */
        context.save();

        context.translate(
          canvas.width,
          0,
        );

        context.scale(-1, 1);

        context.drawImage(
          video,
          0,
          0,
          canvas.width,
          canvas.height,
        );

        context.restore();

        canvas.toBlob(
          (blob) => {
            resolve(blob);
          },
          "image/jpeg",
          0.9,
        );
      });
    };

  // =========================================================
  // VERIFY FACE
  // =========================================================

  const verifyFace = async () => {
    if (verifying) {
      return;
    }

    setError(null);
    setMessage(null);

    const selfieBlob =
      await captureSelfie();

    if (!selfieBlob) {
      setError(
        "Unable to capture your selfie. Please make sure your camera is active and try again.",
      );

      return;
    }

    setVerifying(true);

    try {
      // -------------------------------------------------------
      // CREATE FILE
      // -------------------------------------------------------

      const selfieFile = new File(
        [selfieBlob],
        `selfie-${Date.now()}.jpg`,
        {
          type: "image/jpeg",
        },
      );

      // -------------------------------------------------------
      // FORM DATA
      // -------------------------------------------------------

      const formData =
        new FormData();

      formData.append(
        "selfie",
        selfieFile,
      );

      // -------------------------------------------------------
      // SEND TO BACKEND
      // -------------------------------------------------------

      const response =
        await startFaceVerification(
          formData,
        );

      console.log(
        "=================================",
      );

      console.log(
        "📸 SELFIE VERIFICATION RESPONSE",
      );

      console.log(response);

      console.log(
        "=================================",
      );

      const data =
        response?.data;

      /*
       * IMPORTANT:
       *
       * Do NOT assume success if the backend doesn't
       * explicitly return a successful status.
       */
      const status =
        data?.faceVerificationStatus ||
        data?.status ||
        null;

      // -------------------------------------------------------
      // VERIFIED
      // -------------------------------------------------------

      if (status === "verified") {
        stopCamera();

        setMessage(
          "Your selfie was verified successfully.",
        );

        /*
         * Parent/page decides what happens next.
         */
        onVerified();

        return;
      }

      // -------------------------------------------------------
      // PENDING
      // -------------------------------------------------------

      if (status === "pending") {
        stopCamera();

        setMessage(
          "Your selfie has been submitted and is currently being processed. Please wait for verification to complete.",
        );

        return;
      }

      // -------------------------------------------------------
      // FAILED
      // -------------------------------------------------------

      if (status === "failed") {
        setError(
          data?.faceVerificationReason ||
            response?.message ||
            "Face verification failed. Please try again.",
        );

        return;
      }

      // -------------------------------------------------------
      // UNKNOWN RESPONSE
      // -------------------------------------------------------

      console.error(
        "Unexpected face verification response:",
        response,
      );

      setError(
        "We could not confirm your face verification status. Please try again.",
      );
    } catch (err: any) {
      console.error(
        "❌ FACE VERIFICATION ERROR:",
        err,
      );

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to upload your selfie. Please try again.",
      );
    } finally {
      setVerifying(false);
    }
  };

  // =========================================================
  // ALREADY VERIFIED
  // =========================================================

  if (isVerified) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6">
        <h2 className="text-xl font-semibold text-green-700">
          Face Verification Complete
        </h2>

        <p className="mt-2 text-sm text-green-600">
          Your face verification has already
          been completed.
        </p>
      </div>
    );
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">
        Face Verification
      </h2>

      <p className="mt-2 text-sm text-gray-600">
        Take a clear selfie to complete your
        identity verification.
      </p>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* =====================================================
          MESSAGE
      ===================================================== */}

      {message && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
          {message}
        </div>
      )}

      {/* =====================================================
          CAMERA
      ===================================================== */}

      <div className="relative mt-6 overflow-hidden rounded-xl bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-auto min-h-[280px] w-full object-cover"
          style={{
            transform: "scaleX(-1)",
          }}
        />

        {!cameraStarted && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <p className="px-6 text-center text-sm text-white/70">
              Camera preview will appear here.
            </p>
          </div>
        )}
      </div>

      <canvas
        ref={canvasRef}
        className="hidden"
      />

      {/* =====================================================
          ACTIONS
      ===================================================== */}

      <div className="mt-6 flex flex-wrap gap-3">
        {!cameraStarted && (
          <button
            type="button"
            onClick={startCamera}
            disabled={verifying}
            className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Start Camera
          </button>
        )}

        {cameraStarted && (
          <>
            <button
              type="button"
              onClick={verifyFace}
              disabled={verifying}
              className="rounded-lg bg-green-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {verifying
                ? "Verifying..."
                : "Take Selfie"}
            </button>

            <button
              type="button"
              onClick={stopCamera}
              disabled={verifying}
              className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Stop Camera
            </button>
          </>
        )}
      </div>

      {/* =====================================================
          INSTRUCTIONS
      ===================================================== */}

      <div className="mt-6 rounded-lg bg-gray-50 p-4">
        <h3 className="font-medium">
          Before taking your selfie
        </h3>

        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600">
          <li>
            Make sure your face is clearly
            visible.
          </li>

          <li>
            Use good lighting.
          </li>

          <li>
            Remove anything covering your
            face.
          </li>

          <li>
            Look directly at the camera.
          </li>

          <li>
            Keep your face inside the camera
            frame.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default FaceVerificationStep;

