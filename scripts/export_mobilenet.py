import sys
import types
import tensorflow.python.framework.errors_impl as tf_errors

# tensorflowjs 4.x intenta importar tensorflow_decision_forests aunque no se use.
# En Windows no hay binarios oficiales, así que proveemos un stub mínimo para evitar errores.
try:
	import tensorflow_decision_forests  # type: ignore  # noqa: F401
except (ModuleNotFoundError, tf_errors.NotFoundError):
	package_name = "tensorflow_decision_forests"
	stub = types.ModuleType(package_name)
	stub.__path__ = []  # type: ignore[attr-defined]
	sys.modules[package_name] = stub

	keras_stub = types.ModuleType(f"{package_name}.keras")
	keras_stub.__path__ = []  # type: ignore[attr-defined]
	sys.modules[f"{package_name}.keras"] = keras_stub
	sys.modules[f"{package_name}.keras.core"] = types.ModuleType(f"{package_name}.keras.core")
	sys.modules[f"{package_name}.keras.core_inference"] = types.ModuleType(f"{package_name}.keras.core_inference")

	tf_stub = types.ModuleType(f"{package_name}.tensorflow")
	tf_stub.__path__ = []  # type: ignore[attr-defined]
	sys.modules[f"{package_name}.tensorflow"] = tf_stub
	ops_stub = types.ModuleType(f"{package_name}.tensorflow.ops")
	ops_stub.__path__ = []  # type: ignore[attr-defined]
	sys.modules[f"{package_name}.tensorflow.ops"] = ops_stub
	inference_stub = types.ModuleType(f"{package_name}.tensorflow.ops.inference")
	inference_stub.__path__ = []  # type: ignore[attr-defined]
	sys.modules[f"{package_name}.tensorflow.ops.inference"] = inference_stub
	sys.modules[f"{package_name}.tensorflow.ops.inference.api"] = types.ModuleType(
		f"{package_name}.tensorflow.ops.inference.api"
	)
	sys.modules[f"{package_name}.tensorflow.ops.inference.op"] = types.ModuleType(
		f"{package_name}.tensorflow.ops.inference.op"
	)
	sys.modules[f"{package_name}.tensorflow.ops.inference.op_dynamic"] = types.ModuleType(
		f"{package_name}.tensorflow.ops.inference.op_dynamic"
	)

import tensorflow as tf
import tensorflowjs as tfjs

# Cargar el modelo MobileNetV2 preentrenado (pesos de ImageNet)
model = tf.keras.applications.MobileNetV2(alpha=1.4, weights="imagenet", include_top=False, pooling="avg")

# Exportar el modelo a formato TensorFlow.js
tfjs.converters.save_keras_model(model, "./public/models/mobilenet")

print("✅ Modelo MobileNetV2 exportado correctamente a ./public/models/mobilenet")
