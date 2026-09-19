# Rendimiento y ciclo de vida de recursos

El demo renderiza cientos de objetos (calzada, vecindario, árboles, cielo, peatones y hasta ~14 vehículos × 11 meshes) y puede hacer dos pases de render por frame en primera persona. Estas son las optimizaciones aplicadas y las pendientes.

## Aplicadas

- **Sombras estáticas**: `renderer.shadowMap.autoUpdate = false`. El shadow map solo se recalcula cuando cambia la escena (`markShadowsDirty()`), no en cada frame. El entorno es casi estático.
- **Resize**: `ResizeObserver` + listener de `window` actualizan `renderer.setSize`, el pixel ratio y el `aspect` de la cámara principal. Antes el canvas quedaba con el tamaño inicial.
- **Limpieza de recursos**: `cleanup()` y `disposeMesh()` respetan `userData.shared` y desregistran faros; `TraditionalMode.stop()` ahora recorre y libera vehículos y luces (antes dejaba `PointLight`s huérfanas).
- **Socket**: el listener de `connect` y todos los listeners se remueven en `disconnect()`; el socket se anula, evitando retenciones entre montajes.
- **HUD con throttle**: `ManagedMode` coalesce las publicaciones del HUD a ~10 Hz en vez de publicar en cada evento `state`/`decision` (menos re-render de React).
- **Gamepad**: al reconectar se reutiliza el vehículo del jugador y se elimina el mesh huérfano previo.

## Pendientes (mejoras futuras)

- **Draw calls**: fusionar los ~128 dashes y las cebras de `road.ts` con `mergeGeometries`/`InstancedMesh`, e instanciar el vecindario (casas, farolas, bancas) y las nubes. Puede eliminar ~250–400 draw calls por pase.
- **Luces**: limitar las `PointLight` de vehículos a las N más cercanas a cámara o sustituirlas por emisivo. En noche con avanzado + luces hay hasta ~18 luces dinámicas.
- **Minimapa**: renderizarlo cada 2–3 frames y sin tocar `scene.fog` (usar capas de cámara).
- **Allocations por frame**: reutilizar `Vector3` scratch en `CameraRig`.
- **Atlas de sprites** para las burbujas de estado.

## Reglas al tocar el 3D

- No crear geometrías/materiales dentro del loop de render.
- Marcar como `userData.shared` los recursos de módulo compartidos.
- Toda ruta de montaje debe devolver y llamar `cleanup()` (evita "too many WebGL contexts").
- Interpolar siempre con `lerp`; nunca asignar posición directamente.
