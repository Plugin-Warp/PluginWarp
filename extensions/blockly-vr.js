// Name: BlockifyVR
// ID: blockifyvr
// Description: Access and use cross-platform virtual reality headsets and controllers.
// By: -MasterMath- <https://scratch.mit.edu/users/-MasterMath-/>
// License: MPL-2.0 and MIT

//* Research, planning, and preliminary project development started Friday, January 27, 2023.

/*=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=A-FRAME LIBRARY-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
A-frame library for VR support and ease of development. Their website can be found at https://aframe.io

Minified source code found at https://aframe.io/releases/1.5.0/aframe.min.js.
Unminified source code can be found at https://aframe.io/releases/1.5.0/aframe.js

The A-frame libary is licensed under the MIT license, which can be found at https://github.com/aframevr/aframe/blob/master/LICENSE.

I've licensed this Turbowarp extension as MPL-2.0 and MIT. All code by A-frame should remain under MIT, while all other code recieves MPL-2.0.
=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
*/

(function (Scratch) {
  "use strict";

  if (!Scratch.extensions.unsandboxed) {
    throw new Error(
      "This extension must run unsandboxed for it to work properly."
    );
  }

  const vm = Scratch.vm;
  const runtime = vm.runtime;
  const gl = vm.renderer.gl;

  /* eslint-disable */
  /* global THREE, AFRAME */
  // prettier-ignore
  //# sourceMappingURL=aframe.min.js.map
  /* eslint-enable */

  // prettier-ignore
  const htmlcode = `
  <a-scene renderer="highRefreshRate: true; multiviewStereo: true; foveationLevel: 0.25;" background="color: black" pose-matrices embedded style="display: none">
    <a-entity camera look-controls id="AframeCamera" camera-logger>
      <a-plane id="scratchStageVRDisplay" material="shader: flat; src: #scratchcanvas;" update-display></a-plane>
    </a-entity>
    <a-entity cross-platform-controls="hand: left" left-controller-manager visible="false"></a-entity>
    <a-entity cross-platform-controls="hand: right" right-controller-manager visible="false"></a-entity>
  </a-scene>
  `;
  document.body.prepend(
    document.createRange().createContextualFragment(htmlcode)
  );
  gl.canvas.setAttribute("id", "scratchcanvas");
  const AScene = document.querySelector("a-scene");
  //! Fix bug where pressing the Oculus button causes the texture to zoom.

  function scaleDisplayPlane() {
    requestAnimationFrame(() => {
      const plane = document.getElementById("scratchStageVRDisplay");
      const material = plane.getObject3D("mesh").material;
      let canvas = document.getElementById("scratchcanvas");
      // prevents a WebGL error where changing texture res causes confliction w/ cached texture in GPU.
      if (material && material.map) {
        material.map.dispose();
      }
      material.map = new THREE.Texture(canvas);
      material.map.needsUpdate = true;

      canvas = AScene.renderer.domElement;
      const fov = THREE.MathUtils.degToRad(
        document.getElementById("AframeCamera").components.camera.data.fov
      );
      const canvasAspect = canvas.width / canvas.height;
      const stageAspect = runtime.stageWidth / runtime.stageHeight;
      const distance = 0.5;

      let height = 2 * Math.tan(fov / 2) * distance;
      let width = height * stageAspect;

      if (width < height * canvasAspect) {
        width = height * canvasAspect;
        height = width / stageAspect;
      }

      plane.object3D.scale.set(width, height, 1);
      plane.object3D.position.set(0, 0, -distance);
      material.map.needsUpdate = true;
    });
  }

  AScene.addEventListener("enter-vr", function () {
    inVR = true;
    scaleDisplayPlane();
  });

  AScene.addEventListener("exit-vr", function () {
    inVR = false;
  });

  //handle source texture changing resolution
  const resizeObserver = new ResizeObserver(() => {
    scaleDisplayPlane();
  });

  resizeObserver.observe(document.getElementById("scratchcanvas"));
  //=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
  let inVR = false;

  let cameraRotationX, cameraRotationY, cameraRotationZ;

  let cameraPosX, cameraPosY, cameraPosZ;

  let leftControllerRotationX, leftControllerRotationY, leftControllerRotationZ;

  let leftControllerPositionX, leftControllerPositionY, leftControllerPositionZ;

  let rightControllerRotationX,
    rightControllerRotationY,
    rightControllerRotationZ;

  let rightControllerPositionX,
    rightControllerPositionY,
    rightControllerPositionZ;

  let rightTriggerPressed,
    leftTriggerPressed,
    rightThumbstickPressed,
    leftThumbstickPressed,
    rightGripPressed,
    leftGripPressed,
    aButtonPressed,
    bButtonPressed,
    xButtonPressed,
    yButtonPressed,
    menuButtonPressed,
    systemButtonPressed,
    leftTrackpadButtonPressed,
    rightTrackpadButtonPressed = false;

  let lastButtonPressed;

  let rightTriggerTouched,
    leftTriggerTouched,
    rightThumbstickTouched,
    leftThumbstickTouched,
    rightGripTouched,
    leftGripTouched,
    aButtonTouched,
    bButtonTouched,
    xButtonTouched,
    yButtonTouched,
    leftSurfaceTouched,
    rightSurfaceTouched = false;

  let lastButtonTouched;

  let leftThumbstickX,
    leftThumbstickY,
    rightThumbstickX,
    rightThumbstickY,
    rightThumbstickDirection,
    leftThumbstickDirection,
    leftTrackpadX,
    leftTrackpadY,
    rightTrackpadX,
    rightTrackpadY,
    rightTrackpadDirection,
    leftTrackpadDirection,
    rightTriggerAmount,
    leftTriggerAmount,
    rightGripAmount,
    leftGripAmount;

  let rightControllerConnected,
    leftControllerConnected = false;
  //=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
  AFRAME.registerComponent("update-display", {
    dependencies: ["geometry", "material"],
    init: function () {
      this.material = this.el.getObject3D("mesh").material;
    },
    tick: function () {
      runtime.frameLoop.stepCallback();
      if (this.material && this.material.map) {
        this.material.map.needsUpdate = true;
      }
    },
  });

  let xrProjectionMatrix, xrTransform, xrCombinedMatrix;
  //TODO: Optimize this, too many const declarations per tick cause garbage collection & FPS drops
  //Matrix processing code from the AR extension.
  AFRAME.registerComponent("pose-matrices", {
    tick: function () {
      if (inVR == true) {
        var frame = this.el.frame;
        var xrRefSpace = this.el.renderer.xr.getReferenceSpace();
        if (xrRefSpace) {
          const pose = frame.getViewerPose(xrRefSpace);
          if (pose) {
            xrProjectionMatrix = pose.views[0].projectionMatrix;
            xrTransform = pose.views[0].transform;
            const inverseTransformMatrix = xrTransform.inverse.matrix;
            const a00 = xrProjectionMatrix[0];
            const a01 = xrProjectionMatrix[1];
            const a02 = xrProjectionMatrix[2];
            const a03 = xrProjectionMatrix[3];
            const a10 = xrProjectionMatrix[4];
            const a11 = xrProjectionMatrix[5];
            const a12 = xrProjectionMatrix[6];
            const a13 = xrProjectionMatrix[7];
            const a20 = xrProjectionMatrix[8];
            const a21 = xrProjectionMatrix[9];
            const a22 = xrProjectionMatrix[10];
            const a23 = xrProjectionMatrix[11];
            const a30 = xrProjectionMatrix[12];
            const a31 = xrProjectionMatrix[13];
            const a32 = xrProjectionMatrix[14];
            const a33 = xrProjectionMatrix[15];
            const b00 = inverseTransformMatrix[0];
            const b01 = inverseTransformMatrix[1];
            const b02 = inverseTransformMatrix[2];
            const b03 = inverseTransformMatrix[3];
            const b10 = inverseTransformMatrix[4];
            const b11 = inverseTransformMatrix[5];
            const b12 = inverseTransformMatrix[6];
            const b13 = inverseTransformMatrix[7];
            const b20 = inverseTransformMatrix[8];
            const b21 = inverseTransformMatrix[9];
            const b22 = inverseTransformMatrix[10];
            const b23 = inverseTransformMatrix[11];
            const b30 = inverseTransformMatrix[12];
            const b31 = inverseTransformMatrix[13];
            const b32 = inverseTransformMatrix[14];
            const b33 = inverseTransformMatrix[15];
            xrCombinedMatrix = [
              b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30,
              b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31,
              b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32,
              b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33,
              b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30,
              b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31,
              b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32,
              b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33,
              b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30,
              b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31,
              b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32,
              b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33,
              b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30,
              b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31,
              b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32,
              b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33,
            ];
          }
        }
      }
    },
  });

  let rotation;
  AFRAME.registerComponent("camera-logger", {
    tick: function () {
      rotation = this.el.getAttribute("rotation");
      //Switch rotation Yaw = Y and Pitch = X to Yaw = X and Pitch = Y to match most Scratch 3D engines
      this.el.object3D.rotation.set(
        THREE.MathUtils.degToRad(rotation.y),
        THREE.MathUtils.degToRad(rotation.x),
        THREE.MathUtils.degToRad(rotation.z)
      );
      rotation = this.el.getAttribute("rotation");
      cameraRotationX = rotation.x;
      cameraRotationY = rotation.y;
      cameraRotationZ = rotation.z;
      cameraPosX = this.el.object3D.position.x;
      cameraPosY = this.el.object3D.position.y;
      cameraPosZ = this.el.object3D.position.z;
    },
  });

  AFRAME.registerComponent("cross-platform-controls", {
    schema: {
      hand: { default: "" },
    },

    update: function () {
      var hand = this.data.hand;
      var el = this.el;
      var controlConfiguration = {
        hand: hand,
        model: false,
        orientationOffset: { x: 0, y: 0, z: hand === "left" ? 90 : -90 },
      };

      el.setAttribute("oculus-touch-controls", controlConfiguration);
      el.setAttribute("vive-focus-controls", controlConfiguration);
      el.setAttribute("vive-controls", controlConfiguration);
      el.setAttribute("windows-motion-controls", controlConfiguration);
    },
  });

  AFRAME.registerComponent("right-controller-manager", {
    init: function () {
      let el = this.el;
      el.addEventListener("thumbstickmoved", this.logThumbstick);
      el.addEventListener("trackpadmoved", this.logTrackpad);
      el.addEventListener("triggerchanged", this.logTrigger);
      el.addEventListener("gripchanged", this.logGrip);

      this.el.addEventListener("controllerconnected", function () {
        rightControllerConnected = true;

        runtime.startHats("blockifyvr_whenControllerConnected", {
          controller: "right controller",
          connection: "connected",
        });
      });
      this.el.addEventListener("controllerdisconnected", function () {
        rightControllerConnected = false;

        runtime.startHats("blockifyvr_whenControllerConnected", {
          controller: "right controller",
          connection: "disconnected",
        });
      });

      el.addEventListener("triggerdown", function () {
        rightTriggerPressed = true;
        lastButtonPressed = "right trigger";
        runtime.startHats("blockifyvr_whenButtonPressed", {
          button: "any",
        });
        runtime.startHats("blockifyvr_whenButtonPressed", {
          button: lastButtonPressed,
        });
      });

      el.addEventListener("triggerup", function () {
        rightTriggerPressed = false;
      });

      el.addEventListener("triggertouchstart", function () {
        rightTriggerTouched = true;
        lastButtonTouched = "right trigger";
        runtime.startHats("blockifyvr_whenButtonTouched", {
          button: "any",
        });
        runtime.startHats("blockifyvr_whenButtonTouched", {
          button: lastButtonTouched,
        });
      });

      el.addEventListener("triggertouchend", function () {
        rightTriggerTouched = false;
      });

      el.addEventListener("thumbstickdown", function () {
        rightThumbstickPressed = true;
        lastButtonPressed = "right thumbstick";
        runtime.startHats("blockifyvr_whenButtonPressed", {
          button: "any",
        });
        runtime.startHats("blockifyvr_whenButtonPressed", {
          button: lastButtonPressed,
        });
      });

      el.addEventListener("thumbstickup", function () {
        rightThumbstickPressed = false;
      });

      el.addEventListener("thumbsticktouchstart", function () {
        rightThumbstickTouched = true;
        lastButtonTouched = "right thumbstick";
        runtime.startHats("blockifyvr_whenButtonTouched", {
          button: "any",
        });
        runtime.startHats("blockifyvr_whenButtonTouched", {
          button: lastButtonTouched,
        });
      });

      el.addEventListener("thumbsticktouchend", function () {
        rightThumbstickTouched = false;
      });

      el.addEventListener("trackpaddown", function () {
        rightTrackpadButtonPressed = true;
        lastButtonPressed = "right trackpad";
        runtime.startHats("blockifyvr_whenButtonPressed", {
          button: "any",
        });
        runtime.startHats("blockifyvr_whenButtonPressed", {
          button: lastButtonPressed,
        });
      });

      el.addEventListener("trackpadup", function () {
        rightTrackpadButtonPressed = false;
      });

      el.addEventListener("gripdown", function () {
        rightGripPressed = true;
        lastButtonPressed = "right grip";
        runtime.startHats("blockifyvr_whenButtonPressed", {
          button: "any",
        });
        runtime.startHats("blockifyvr_whenButtonPressed", {
          button: lastButtonPressed,
        });
      });

      el.addEventListener("gripup", function () {
        rightGripPressed = false;
      });

      el.addEventListener("griptouchstart", function () {
        rightGripTouched = true;
        lastButtonTouched = "right grip";
        runtime.startHats("blockifyvr_whenButtonTouched", {
          button: "any",
        });
        runtime.startHats("blockifyvr_whenButtonTouched", {
          button: lastButtonTouched,
        });
      });

      el.addEventListener("griptouchend", function () {
        rightGripTouched = false;
      });

      el.addEventListener("abuttondown", function () {
        aButtonPressed = true;
        lastButtonPressed = "A";
        runtime.startHats("blockifyvr_whenButtonPressed", {
          button: "any",
        });
        runtime.startHats("blockifyvr_whenButtonPressed", {
          button: lastButtonPressed,
        });
      });

      el.addEventListener("abuttonup", function () {
        aButtonPressed = false;
      });

      el.addEventListener("abuttontouchstart", function () {
        aButtonTouched = true;
        lastButtonTouched = "A";
        runtime.startHats("blockifyvr_whenButtonTouched", {
          button: "any",
        });
        runtime.startHats("blockifyvr_whenButtonTouched", {
          button: lastButtonTouched,
        });
      });

      el.addEventListener("abuttontouchend", function () {
        rightThumbstickTouched = false;
      });

      el.addEventListener("bbuttondown", function () {
        bButtonPressed = true;
        lastButtonPressed = "B";
        runtime.startHats("blockifyvr_whenButtonPressed", {
          button: "any",
        });
        runtime.startHats("blockifyvr_whenButtonPressed", {
          button: lastButtonPressed,
        });
      });

      el.addEventListener("bbuttonup", function () {
        bButtonPressed = false;
      });

      el.addEventListener("bbuttontouchstart", function () {
        bButtonTouched = true;
        lastButtonTouched = "B";
        runtime.startHats("blockifyvr_whenButtonTouched", {
          button: "any",
        });
        runtime.startHats("blockifyvr_whenButtonTouched", {
          button: lastButtonTouched,
        });
      });

      el.addEventListener("bbuttontouchend", function () {
        bButtonTouched = false;
      });

      //vive-controls only
      el.addEventListener("systemdown", function () {
        systemButtonPressed = true;
        lastButtonPressed = "System";
        runtime.startHats("blockifyvr_whenButtonPressed", {
          button: "any",
        });
        runtime.startHats("blockifyvr_whenButtonPressed", {
          button: lastButtonPressed,
        });
      });

      el.addEventListener("systemup", function () {
        systemButtonPressed = false;
      });

      el.addEventListener("surfacetouchstart", function () {
        rightSurfaceTouched = true;
        lastButtonTouched = "right surface";
        runtime.startHats("blockifyvr_whenButtonTouched", {
          button: "any",
        });
        runtime.startHats("blockifyvr_whenButtonTouched", {
          button: lastButtonTouched,
        });
      });

      el.addEventListener("surfacetouchend", function () {
        rightSurfaceTouched = false;
      });
    },

    tick: function () {
      rightControllerRotationX = THREE.MathUtils.radToDeg(
        this.el.object3D.rotation.x
      );
      rightControllerRotationY = THREE.MathUtils.radToDeg(
        this.el.object3D.rotation.y
      );
      rightControllerRotationZ = THREE.MathUtils.radToDeg(
        this.el.object3D.rotation.z
      );

      rightControllerPositionX = this.el.object3D.position.x;
      rightControllerPositionY = this.el.object3D.position.y;
      rightControllerPositionZ = this.el.object3D.position.z;
    },

    logThumbstick: function (evt) {
      rightThumbstickX = evt.detail.x;
      rightThumbstickY = evt.detail.y;
      rightThumbstickDirection =
        (Math.atan2(rightThumbstickY, rightThumbstickX) * 180) / Math.PI + 90;
    },

    logTrackpad: function (evt) {
      rightTrackpadX = evt.detail.x;
      rightTrackpadY = evt.detail.y;
      rightTrackpadDirection =
        (Math.atan2(rightThumbstickY, rightThumbstickX) * 180) / Math.PI + 90;
    },

    logTrigger: function (evt) {
      rightTriggerAmount = evt.detail.value;
    },

    logGrip: function (evt) {
      rightGripAmount = evt.detail.value;
    },
  });

  AFRAME.registerComponent("left-controller-manager", {
    init: function () {
      let el = this.el;
      el.addEventListener("thumbstickmoved", this.logThumbstick);
      el.addEventListener("trackpadmoved", this.logTrackpad);
      el.addEventListener("triggerchanged", this.logTrigger);
      el.addEventListener("gripchanged", this.logGrip);

      el.addEventListener("controllerconnected", function () {
        leftControllerConnected = true;

        runtime.startHats("blockifyvr_whenControllerConnected", {
          controller: "left controller",
          connection: "connected",
        });
      });
      el.addEventListener("controllerdisconnected", function () {
        leftControllerConnected = false;

        runtime.startHats("blockifyvr_whenControllerConnected", {
          controller: "left controller",
          connection: "disconnected",
        });
      });

      el.addEventListener("triggerdown", function () {
        leftTriggerPressed = true;
        lastButtonPressed = "left trigger";
        runtime.startHats("blockifyvr_whenButtonPressed", {
          button: "any",
        });
        runtime.startHats("blockifyvr_whenButtonPressed", {
          button: lastButtonPressed,
        });
      });

      el.addEventListener("triggerup", function () {
        leftTriggerPressed = false;
      });

      el.addEventListener("triggertouchstart", function () {
        leftTriggerTouched = true;
        lastButtonTouched = "left trigger";
        runtime.startHats("blockifyvr_whenButtonTouched", {
          button: "any",
        });
        runtime.startHats("blockifyvr_whenButtonTouched", {
          button: lastButtonTouched,
        });
      });

      el.addEventListener("triggertouchend", function () {
        leftTriggerTouched = false;
      });

      el.addEventListener("thumbstickdown", function () {
        leftThumbstickPressed = true;
        lastButtonPressed = "left thumbstick";
        runtime.startHats("blockifyvr_whenButtonPressed", {
          button: "any",
        });
        runtime.startHats("blockifyvr_whenButtonPressed", {
          button: lastButtonPressed,
        });
      });

      el.addEventListener("thumbstickup", function () {
        leftThumbstickPressed = false;
      });

      el.addEventListener("thumbsticktouchstart", function () {
        leftThumbstickTouched = true;
        lastButtonTouched = "left thumbstick";
        runtime.startHats("blockifyvr_whenButtonTouched", {
          button: "any",
        });
        runtime.startHats("blockifyvr_whenButtonTouched", {
          button: lastButtonTouched,
        });
      });

      el.addEventListener("thumbsticktouchend", function () {
        leftThumbstickTouched = false;
      });

      el.addEventListener("trackpaddown", function () {
        leftTrackpadButtonPressed = true;
        lastButtonPressed = "left trackpad";
        runtime.startHats("blockifyvr_whenButtonPressed", {
          button: "any",
        });
        runtime.startHats("blockifyvr_whenButtonPressed", {
          button: lastButtonPressed,
        });
      });

      el.addEventListener("trackpadup", function () {
        leftTrackpadButtonPressed = false;
      });

      el.addEventListener("gripdown", function () {
        leftGripPressed = true;
        lastButtonPressed = "left grip";
        runtime.startHats("blockifyvr_whenButtonPressed", {
          button: "any",
        });
        runtime.startHats("blockifyvr_whenButtonPressed", {
          button: lastButtonPressed,
        });
      });

      el.addEventListener("gripup", function () {
        leftGripPressed = false;
      });

      el.addEventListener("griptouchstart", function () {
        leftGripTouched = true;
        lastButtonTouched = "left grip";
        runtime.startHats("blockifyvr_whenButtonTouched", {
          button: "any",
        });
        runtime.startHats("blockifyvr_whenButtonTouched", {
          button: lastButtonTouched,
        });
      });

      el.addEventListener("griptouchend", function () {
        leftGripTouched = false;
      });

      el.addEventListener("xbuttondown", function () {
        xButtonPressed = true;
        lastButtonPressed = "X";
        runtime.startHats("blockifyvr_whenButtonPressed", {
          button: "any",
        });
        runtime.startHats("blockifyvr_whenButtonPressed", {
          button: lastButtonPressed,
        });
      });

      el.addEventListener("xbuttonup", function () {
        xButtonPressed = false;
      });

      el.addEventListener("xbuttontouchstart", function () {
        xButtonTouched = true;
        lastButtonTouched = "X";
        runtime.startHats("blockifyvr_whenButtonTouched", {
          button: "any",
        });
        runtime.startHats("blockifyvr_whenButtonTouched", {
          button: lastButtonTouched,
        });
      });

      el.addEventListener("xbuttontouchend", function () {
        xButtonTouched = false;
      });

      el.addEventListener("ybuttondown", function () {
        yButtonPressed = true;
        lastButtonPressed = "Y";
        runtime.startHats("blockifyvr_whenButtonPressed", {
          button: "any",
        });
        runtime.startHats("blockifyvr_whenButtonPressed", {
          button: lastButtonPressed,
        });
      });

      el.addEventListener("ybuttonup", function () {
        yButtonPressed = false;
      });

      el.addEventListener("ybuttontouchstart", function () {
        yButtonTouched = true;
        lastButtonTouched = "Y";
        runtime.startHats("blockifyvr_whenButtonTouched", {
          button: "any",
        });
        runtime.startHats("blockifyvr_whenButtonTouched", {
          button: lastButtonTouched,
        });
      });

      el.addEventListener("ybuttontouchend", function () {
        yButtonTouched = false;
      });

      el.addEventListener("menubuttonup", function () {
        menuButtonPressed = true;
        lastButtonPressed = "Menu";
        runtime.startHats("blockifyvr_whenButtonPressed", {
          button: "any",
        });
        runtime.startHats("blockifyvr_whenButtonPressed", {
          button: lastButtonPressed,
        });
      });

      el.addEventListener("menubuttondown", function () {
        menuButtonPressed = false;
      });

      el.addEventListener("surfacetouchstart", function () {
        leftSurfaceTouched = true;
        lastButtonTouched = "left surface";
        runtime.startHats("blockifyvr_whenButtonTouched", {
          button: "any",
        });
        runtime.startHats("blockifyvr_whenButtonTouched", {
          button: lastButtonTouched,
        });
      });

      el.addEventListener("surfacetouchend", function () {
        leftSurfaceTouched = false;
      });
    },

    tick: function () {
      leftControllerRotationX = THREE.MathUtils.radToDeg(
        this.el.object3D.rotation.x
      );
      leftControllerRotationY = THREE.MathUtils.radToDeg(
        this.el.object3D.rotation.y
      );
      leftControllerRotationZ = THREE.MathUtils.radToDeg(
        this.el.object3D.rotation.z
      );

      leftControllerPositionX = this.el.object3D.position.x;
      leftControllerPositionY = this.el.object3D.position.y;
      leftControllerPositionZ = this.el.object3D.position.z;
    },

    logThumbstick: function (evt) {
      leftThumbstickX = evt.detail.x;
      leftThumbstickY = evt.detail.y;
      leftThumbstickDirection =
        (Math.atan2(leftThumbstickY, leftThumbstickX) * 180) / Math.PI + 90;
    },

    logTrackpad: function (evt) {
      leftTrackpadX = evt.detail.x;
      leftTrackpadY = evt.detail.y;
      leftTrackpadDirection =
        (Math.atan2(rightThumbstickY, rightThumbstickX) * 180) / Math.PI + 90;
    },

    logTrigger: function (evt) {
      leftTriggerAmount = evt.detail.value;
    },

    logGrip: function (evt) {
      leftGripAmount = evt.detail.value;
    },
  });

  const icon =
    "data:image/png;base64,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";

  class BlockifyVR {
    getInfo() {
      return {
        id: "blockifyvr",
        color1: "#00a616",
        color2: "#02ad19",
        color3: "#128211",
        name: "BlockifyVR",
        menuIconURI: icon,
        blockIconURI: icon,
        //docsURI: 'https://extensions.turbowarp.org/MasterMath/BlockifyVR', //TODO: update this URL when the extension is finished.
        //TODO: Add "Give Feedback" button.
        blocks: [
          {
            blockType: "label",
            text: "Utilities",
          },
          {
            opcode: "toggleVrMode",
            blockType: Scratch.BlockType.COMMAND,
            text: "[enterExit] vr mode",
            arguments: {
              enterExit: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "enter",
                menu: "toggleVrMode",
              },
            },
          },
          {
            opcode: "inVR",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "in vr?",
            disableMonitor: "true",
          },
          {
            opcode: "headsetConnected",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "is headset connected?",
            disableMonitor: "true",
          },
          {
            opcode: "getStageWidth",
            blockType: Scratch.BlockType.REPORTER,
            text: "stage width",
            disableMonitor: "true",
          },
          {
            opcode: "getStageHeight",
            blockType: Scratch.BlockType.REPORTER,
            text: "stage height",
            disableMonitor: "true",
          },
          "---",
          {
            blockType: "label",
            text: "Transformations",
          },
          {
            opcode: "positionOf",
            blockType: Scratch.BlockType.REPORTER,
            text: "[position] of [Device]",
            arguments: {
              position: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "x-position",
                menu: "positionMenu",
              },
              Device: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "headset",
                menu: "deviceMenu",
              },
            },
          },
          {
            opcode: "rotationOf",
            blockType: Scratch.BlockType.REPORTER,
            text: "[direction] of [device]",
            arguments: {
              direction: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "x-rotation",
                menu: "rotationMenu",
              },
              device: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "headset",
                menu: "deviceMenu",
              },
            },
          },
          //* Matrix block code from the Augmented Reality extension.
          {
            opcode: "getMatrix",
            blockType: Scratch.BlockType.REPORTER,
            text: "item [ITEM] of [MATRIX] matrix",
            arguments: {
              ITEM: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1,
              },
              MATRIX: {
                type: Scratch.ArgumentType.STRING,
                menu: "matrix",
                defaultValue: "combined",
              },
            },
          },
          "---",
          {
            blockType: "label",
            text: "Controllers",
          },
          {
            opcode: "controllerConnected",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "is [controller] connected?",
            arguments: {
              controller: {
                type: Scratch.ArgumentType.STRING,
                menu: "controllerMenu",
                defaultValue: "left controller",
              },
            },
          },
          {
            opcode: "whenControllerConnected",
            blockType: Scratch.BlockType.EVENT,
            text: "when [controller] [connection]",
            isEdgeActivated: false,
            arguments: {
              controller: {
                type: Scratch.ArgumentType.STRING,
                menu: "controllerMenu",
                defaultValue: "left controller",
              },
              connection: {
                type: Scratch.ArgumentType.STRING,
                menu: "connectionMenu",
                defaultValue: "connected",
              },
            },
          },
          {
            opcode: "whenButtonPressed",
            blockType: Scratch.BlockType.EVENT,
            text: "when [button] pressed",
            isEdgeActivated: false,
            arguments: {
              button: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "any",
                menu: "buttonMenu",
              },
            },
          },
          {
            opcode: "whenButtonTouched",
            blockType: Scratch.BlockType.EVENT,
            text: "when [button] touched",
            isEdgeActivated: false,
            arguments: {
              button: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "any",
                menu: "oculusButtons",
              },
            },
          },
          {
            opcode: "isButtonPressed",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "button [button] pressed?",
            arguments: {
              button: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "any",
                menu: "buttonMenu",
              },
            },
          },
          {
            opcode: "isButtonTouched",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "button [button] touched?",
            arguments: {
              button: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "any",
                menu: "oculusButtons",
              },
            },
          },
          {
            opcode: "lastButtonPressed",
            blockType: Scratch.BlockType.REPORTER,
            text: "last button pressed",
            disableMonitor: true,
          },
          {
            opcode: "lastButtonTouched",
            blockType: Scratch.BlockType.REPORTER,
            text: "last button touched",
            disableMonitor: true,
          },
          {
            opcode: "triggerGripValue",
            blockType: Scratch.BlockType.REPORTER,
            text: "[button] value",
            arguments: {
              button: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "left trigger",
                menu: "floatButtonMenu",
              },
            },
          },
          {
            opcode: "thumbstickTrackpadInfo",
            blockType: Scratch.BlockType.REPORTER,
            text: "[axisInput] [value]",
            arguments: {
              axisInput: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "left thumbstick",
                menu: "axisInputMenu",
              },
              value: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "direction",
                menu: "value",
              },
            },
          },
          {
            opcode: "isThumbstickDirection",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "is [controller] thumbstick direction [direction]?",
            arguments: {
              controller: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "left controller",
                menu: "controllerMenu",
              },
              direction: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "up",
                menu: "cardinalDirection",
              },
            },
          },
        ],
        menus: {
          toggleVrMode: {
            acceptReporters: false,
            items: ["enter", "exit"],
          },
          rotationMenu: {
            acceptReporters: false,
            items: ["x-rotation", "y-rotation", "z-rotation"],
          },
          deviceMenu: {
            acceptReporters: false,
            items: ["headset", "left controller", "right controller"],
          },
          positionMenu: {
            acceptReporters: false,
            items: ["x-position", "y-position", "z-position"],
          },
          //This is from the Augmented Reality extension. Credit goes to it for the matrix processing.
          matrix: {
            acceptReporters: false,
            items: ["combined", "projection", "view", "inverse view"],
          },
          buttonMenu: {
            acceptReporters: false,
            items: [
              "any",
              "left trigger",
              "right trigger",
              "left grip",
              "right grip",
              "A",
              "B",
              "X",
              "Y",
              "left thumbstick",
              "right thumbstick",
              "left trackpad",
              "right trackpad",
              "menu",
              "system",
            ],
          },
          oculusButtons: {
            acceptReporters: false,
            items: [
              "any",
              "left trigger",
              "right trigger",
              "left grip",
              "right grip",
              "A",
              "B",
              "X",
              "Y",
              "left thumbstick",
              "right thumbstick",
              "left surface",
              "right surface",
            ],
          },
          floatButtonMenu: {
            acceptReporters: false,
            items: ["left trigger", "right trigger", "left grip", "right grip"],
          },
          controllerMenu: {
            acceptReporters: false,
            items: ["left controller", "right controller"],
          },
          value: {
            acceptReporters: false,
            items: ["direction", "x value", "y value"],
          },
          cardinalDirection: {
            acceptReporters: false,
            items: ["up", "down", "left", "right"],
          },
          axisInputMenu: {
            acceptReporters: false,
            items: [
              "left thumbstick",
              "right thumbstick",
              "left trackpad",
              "right trackpad",
            ],
          },
          connectionMenu: {
            acceptReporters: false,
            items: ["connected", "disconnected"],
          },
        },
      };
    }

    toggleVrMode({ enterExit }) {
      if (enterExit == "enter") {
        if (confirm("Would you like to enter VR mode?") == true) {
          AScene.enterVR(); //enter VR mode
        }
      } else if (enterExit == "exit") {
        AScene.exitVR();
      }
    }

    inVR() {
      return inVR;
    }

    headsetConnected() {
      return AFRAME.utils.device.checkHeadsetConnected();
    }

    controllerConnected({ controller }) {
      if (controller == "left controller") {
        return leftControllerConnected;
      }
      if (controller == "right controller") {
        return rightControllerConnected;
      }
    }

    //* This is from the augmented reality extension.
    getMatrix(args) {
      let item = args.ITEM | 0;
      if (item < 1 && item > 16) return "";
      let matrix = null;
      switch (args.MATRIX) {
        case "combined":
          matrix = xrCombinedMatrix;
          break;
        case "projection":
          matrix = xrProjectionMatrix;
          break;
        case "view":
          matrix = xrTransform?.matrix;
          break;
        case "inverse view":
          matrix = xrTransform?.inverse?.matrix;
          break;
      }
      if (!matrix) return 0;
      return matrix[item - 1] || 0;
    }

    getStageWidth() {
      return runtime.stageWidth;
    }

    getStageHeight() {
      return runtime.stageHeight;
    }

    positionOf({ position, Device }) {
      if (position == "x-position" && Device == "headset") {
        return cameraPosX;
      }

      if (position == "y-position" && Device == "headset") {
        return cameraPosY;
      }

      if (position == "z-position" && Device == "headset") {
        return cameraPosZ;
      }

      if (position == "x-position" && Device == "left controller") {
        return leftControllerPositionX;
      }

      if (position == "y-position" && Device == "left controller") {
        return leftControllerPositionY;
      }

      if (position == "z-position" && Device == "left controller") {
        return leftControllerPositionZ;
      }

      if (position == "x-position" && Device == "right controller") {
        return rightControllerPositionX;
      }

      if (position == "y-position" && Device == "right controller") {
        return rightControllerPositionY;
      }

      if (position == "z-position" && Device == "right controller") {
        return rightControllerPositionZ;
      }
    }

    rotationOf({ direction, device }) {
      if (direction == "x-rotation" && device == "headset") {
        return cameraRotationX;
      }

      if (direction == "y-rotation" && device == "headset") {
        return cameraRotationY;
      }

      if (direction == "z-rotation" && device == "headset") {
        return cameraRotationZ;
      }

      if (direction == "x-rotation" && device == "left controller") {
        return leftControllerRotationX;
      }

      if (direction == "y-rotation" && device == "left controller") {
        return leftControllerRotationY;
      }

      if (direction == "z-rotation" && device == "left controller") {
        return leftControllerRotationZ;
      }

      if (direction == "x-rotation" && device == "right controller") {
        return rightControllerRotationX;
      }

      if (direction == "y-rotation" && device == "right controller") {
        return rightControllerRotationY;
      }

      if (direction == "z-rotation" && device == "right controller") {
        return rightControllerRotationZ;
      }
    }

    isButtonPressed({ button }) {
      if (button == "left trigger") {
        return leftTriggerPressed;
      }

      if (button == "right trigger") {
        return rightTriggerPressed;
      }

      if (button == "left grip") {
        return leftGripPressed;
      }

      if (button == "right grip") {
        return rightGripPressed;
      }

      if (button == "left thumbstick") {
        return leftThumbstickPressed;
      }

      if (button == "right thumbstick") {
        return rightThumbstickPressed;
      }

      if (button == "A") {
        return aButtonPressed;
      }

      if (button == "B") {
        return bButtonPressed;
      }

      if (button == "X") {
        return xButtonPressed;
      }

      if (button == "Y") {
        return yButtonPressed;
      }

      if (button == "left trackpad") {
        return leftTrackpadButtonPressed;
      }

      if (button == "right trackpad") {
        return rightTrackpadButtonPressed;
      }

      if (button == "menu") {
        return menuButtonPressed;
      }

      if (button == "system") {
        return systemButtonPressed;
      }

      if (button == "any") {
        if (
          leftTriggerPressed ||
          rightTriggerPressed ||
          leftGripPressed ||
          rightGripPressed ||
          leftThumbstickPressed ||
          rightThumbstickPressed ||
          aButtonPressed ||
          bButtonPressed ||
          xButtonPressed ||
          yButtonPressed ||
          leftTrackpadButtonPressed ||
          rightTrackpadButtonPressed ||
          menuButtonPressed ||
          systemButtonPressed
        ) {
          return true;
        } else {
          return false;
        }
      }
    }

    isButtonTouched({ button }) {
      if (button == "left trigger") {
        return leftTriggerTouched;
      }

      if (button == "right trigger") {
        return rightTriggerTouched;
      }

      if (button == "left grip") {
        return leftGripTouched;
      }

      if (button == "right grip") {
        return rightGripTouched;
      }

      if (button == "left thumbstick") {
        return leftThumbstickTouched;
      }

      if (button == "right thumbstick") {
        return rightThumbstickTouched;
      }

      if (button == "A") {
        return aButtonTouched;
      }

      if (button == "B") {
        return bButtonTouched;
      }

      if (button == "X") {
        return xButtonTouched;
      }

      if (button == "Y") {
        return yButtonTouched;
      }

      if (button == "left surface") {
        return leftSurfaceTouched;
      }

      if (button == "right surface") {
        return rightSurfaceTouched;
      }

      if (button == "any") {
        if (
          leftTriggerTouched ||
          rightTriggerTouched ||
          leftGripTouched ||
          rightGripTouched ||
          leftThumbstickTouched ||
          rightThumbstickTouched ||
          aButtonTouched ||
          bButtonTouched ||
          xButtonTouched ||
          yButtonTouched ||
          leftSurfaceTouched ||
          rightSurfaceTouched
        ) {
          return true;
        } else {
          return false;
        }
      }
    }

    triggerGripValue({ button }) {
      if (button == "left trigger") {
        return leftTriggerAmount;
      }

      if (button == "right trigger") {
        return rightTriggerAmount;
      }

      if (button == "left grip") {
        return leftGripAmount;
      }

      if (button == "right grip") {
        return rightGripAmount;
      }
    }

    thumbstickTrackpadInfo({ axisInput, value }) {
      //left controller
      if (value == "x value" && axisInput == "left thumbstick") {
        return leftThumbstickX;
      }

      if (value == "y value" && axisInput == "left thumbstick") {
        return leftThumbstickY;
      }

      if (value == "direction" && axisInput == "left thumbstick") {
        return leftThumbstickDirection;
      }

      //right controller
      if (value == "x value" && axisInput == "right thumbstick") {
        return rightThumbstickX;
      }

      if (value == "y value" && axisInput == "right thumbstick") {
        return rightThumbstickY;
      }

      if (value == "direction" && axisInput == "right thumbstick") {
        return rightThumbstickDirection;
      }

      if (value == "x value" && axisInput == "left trackpad") {
        return leftTrackpadX;
      }

      if (value == "y value" && axisInput == "left trackpad") {
        return leftTrackpadY;
      }

      if (value == "direction" && axisInput == "left trackpad") {
        return leftTrackpadDirection;
      }

      //right controller
      if (value == "x value" && axisInput == "right trackpad") {
        return rightTrackpadX;
      }

      if (value == "y value" && axisInput == "right trackpad") {
        return rightTrackpadY;
      }

      if (value == "direction" && axisInput == "right trackpad") {
        return rightTrackpadDirection;
      }
    }

    isThumbstickDirection({ controller, direction }) {
      if (controller == "left controller") {
        if (leftThumbstickY > 0.95 && direction == "up") {
          return true;
        } else if (leftThumbstickY < -0.95 && direction == "down") {
          return true;
        } else if (leftThumbstickX < -0.95 && direction == "left") {
          return true;
        } else if (leftThumbstickX > 0.95 && direction == "right") {
          return true;
        } else {
          return false;
        }
      } else if (controller == "right controller") {
        if (rightThumbstickY > 0.95 && direction == "up") {
          return true;
        } else if (rightThumbstickY < -0.95 && direction == "down") {
          return true;
        } else if (rightThumbstickX < -0.95 && direction == "left") {
          return true;
        } else if (rightThumbstickX > 0.95 && direction == "right") {
          return true;
        } else {
          return false;
        }
      }
    }

    lastButtonPressed() {
      return lastButtonPressed;
    }

    lastButtonTouched() {
      return lastButtonTouched;
    }
  }

  Scratch.extensions.register(new BlockifyVR());
})(Scratch);