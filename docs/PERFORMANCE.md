# Rendimiento y ciclo de vida de recursos

El demo renderiza cientos de objetos (calzada, vecindario, árboles, cielo, peatones y hasta ~14 vehículos × 11 meshes) y puede hacer dos pases de render por frame en primera persona. Estas son las optimizaciones aplicadas y las pendientes.

## Aplicadas

- **Marcas de calzada fusionadas**: `road.ts` ya no crea ~120 dashes + ~28 franjas de cebra + 2 líneas centrales como meshes separados. Con `mergeGeometries` quedan **3 meshes** (líneas centrales, líneas discontinuas y cebras): de ~150 draw calls a 3.
- **Vecindario/árboles/nubes fusionados por material**: casas (~60 → ~8, cuerpo por color + techo + puerta + ventanas), bancas (16 → 1), farolas (24 → 2, más 4 luces de esquina), árboles (24 → 2) y palmeras (16 → 2) en `advancedGraphics.ts`; las nubes pasan de **75 → 1** en `sky.ts`. Las sombras siguen funcionando (static + `castShadow` en los meshes fusionados).
- **Minimapa cada 2 frames**: el segundo pase de render (minimapa) se hace en frames alternos, reduciendo a la mitad su costo en primera persona.
- **Sin allocations por frame**: `CameraRig` reutiliza `Vector3` scratch (posición/lookAt de seguimiento, retorno a órbita, vector derecho) y el proveedor del jugador se crea una sola vez.
- **Sombras estáticas**: `renderer.shadowMap.autoUpdate = false`. El shadow map solo se recalcula cuando cambia la escena (`markShadowsDirty()`), no en cada frame. El entorno es casi estático.
- **Resize**: `ResizeObserver` + listener de `window` actualizan `renderer.setSize`, el pixel ratio y el `aspect` de la cámara principal. Antes el canvas quedaba con el tamaño inicial.
- **Limpieza de recursos**: `cleanup()` y `disposeMesh()` respetan `userData.shared` y desregistran faros; `TraditionalMode.stop()` ahora recorre y libera vehículos y luces (antes dejaba `PointLight`s huérfanas).
- **Socket**: el listener de `connect` y todos los listeners se remueven en `disconnect()`; el socket se anula, evitando retenciones entre montajes.
- **HUD con throttle**: `ManagedMode` coalesce las publicaciones del HUD a ~10 Hz en vez de publicar en cada evento `state`/`decision` (menos re-render de React).
- **Gamepad**: al reconectar se reutiliza el vehículo del jugador y se elimina el mesh huérfano previo.

## Pendientes (mejoras futuras)

- **Peatones/burbujas**: fusionar o instanciar los peatones y usar un atlas de sprites para las burbujas (draw calls restantes).
- **Luces**: limitar las `PointLight` de vehículos a las N más cercanas a cámara o sustituirlas por emisivo. En noche con avanzado + luces hay hasta ~18 luces dinámicas.
- **Minimapa**: evitar tocar `scene.fog` (usar capas de cámara) en lugar de guardarlo/restaurarlo.
- **Atlas de sprites** para las burbujas de estado.

## Reglas al tocar el 3D

- No crear geometrías/materiales dentro del loop de render.
- Marcar como `userData.shared` los recursos de módulo compartidos.
- Toda ruta de montaje debe devolver y llamar `cleanup()` (evita "too many WebGL contexts").
- Interpolar siempre con `lerp`; nunca asignar posición directamente.
