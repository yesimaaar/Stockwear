// Copia y pega esto en tu archivo de tipos
declare module '@tensorflow/tfjs-node' {
    // Importa todos los tipos del módulo base de TensorFlow
    import * as tf from '@tensorflow/tfjs';

    // Define las extensiones que son únicas del entorno Node (como tf.node)
    interface NodeAPIExtensions {
        node: typeof import('@tensorflow/tfjs-node/dist/node');
    }

    // Declara que el módulo final es una unión del módulo base y las extensiones de Node
    const fullModule: typeof tf & NodeAPIExtensions;
    
    // Exporta esta unión como el módulo "@tensorflow/tfjs-node"
    export = fullModule;
}