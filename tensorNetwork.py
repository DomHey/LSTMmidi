import numpy as np
import tensorflow as tf
from random import randint
import sys
import functools
try:
    import simplejson as json
except (ImportError,):
    import json

file = open("keys.txt", "r")
lines = file.read()  
IOKEYS = json.loads(lines)

file = open("trainingsSet.txt", "r")
lines = file.read()  
trainingsSet = json.loads(lines)

trainingInputs = []
trainingOutputs = []
note1 = randint(0,len(IOKEYS))
note2 = randint(0,len(IOKEYS))
note3 = randint(0,len(IOKEYS))

def getEmptyIArray():
        a = []
        for index in range(len(IOKEYS)):
            a.append(0)
        return a

def getEmptyOArray():
        a = []
        for index in range(len(IOKEYS)):
            a.append(0)
        return a

for index in range(len(trainingsSet)):
    sample = trainingsSet[index]
    inputs = sample[0]
    output = sample[1]
    i = getEmptyIArray()
    o = getEmptyOArray()
    o[output[0]] = 1
    for a in range(len(inputs)):
        i[inputs[a]] = 1
    trainingInputs.append(i)
    trainingOutputs.append(o)

def doublewrap(function):
    """
    A decorator decorator, allowing to use the decorator to be used without
    parentheses if not arguments are provided. All arguments must be optional.
    """
    @functools.wraps(function)
    def decorator(*args, **kwargs):
        if len(args) == 1 and len(kwargs) == 0 and callable(args[0]):
            return function(args[0])
        else:
            return lambda wrapee: function(wrapee, *args, **kwargs)
    return decorator


@doublewrap
def define_scope(function, scope=None, *args, **kwargs):
    """
    A decorator for functions that define TensorFlow operations. The wrapped
    function will only be executed once. Subsequent calls to it will directly
    return the result so that operations are added to the graph only once.
    The operations added by the function live within a tf.variable_scope(). If
    this decorator is used with arguments, they will be forwarded to the
    variable scope. The scope name defaults to the name of the wrapped
    function.
    """
    attribute = '_cache_' + function.__name__
    name = scope or function.__name__
    @property
    @functools.wraps(function)
    def decorator(self):
        if not hasattr(self, attribute):
            with tf.variable_scope(name, *args, **kwargs):
                setattr(self, attribute, function(self))
        return getattr(self, attribute)
    return decorator


class Model:

    def __init__(self, image, label):
        self.image = image
        self.label = label
        self.prediction
        self.optimize
        self.error

    @define_scope(initializer=tf.contrib.slim.xavier_initializer())
    def prediction(self):
        x = self.image
        x = tf.contrib.slim.fully_connected(x, 200)
        x = tf.contrib.slim.fully_connected(x, 200)
        x = tf.contrib.slim.fully_connected(x, len(trainingOutputs[0]), tf.nn.softmax)
        return x

    @define_scope
    def optimize(self):
        logprob = tf.log(self.prediction + 1e-12)
        cross_entropy = -tf.reduce_sum(self.label * logprob)
        optimizer = tf.train.RMSPropOptimizer(0.03)
        return optimizer.minimize(cross_entropy)

    @define_scope
    def error(self):
        mistakes = tf.not_equal(
            tf.argmax(self.label, 1), tf.argmax(self.prediction, 1))
        return tf.reduce_mean(tf.cast(mistakes, tf.float32))


image = tf.placeholder(tf.float32, [None, len(trainingInputs[0])])
label = tf.placeholder(tf.float32, [None, len(trainingOutputs[0])])
model = Model(image, label)
sess = tf.Session()
sess.run(tf.initialize_all_variables())

def trainNetwork():
    epoch = 10
    for i in range(epoch):
        sess.run(model.optimize, {image: trainingInputs, label: trainingOutputs})
        sys.stdout.write("Epoch " + str(i) + '\n')
        sys.stdout.flush()


def generateOutput(ep):
    incorrect = sess.run(model.error, {image: trainingInputs, label: trainingOutputs})
    sys.stdout.write('error {:3.1f}%'.format(100 * incorrect) + "\n")
    sys.stdout.flush()
    predictedNotes = []
    predictedNotes.append(note1)
    predictedNotes.append(note2)
    predictedNotes.append(note3)

    for i in range(200):
        inp = getEmptyIArray()
        inp[predictedNotes[i]] = 1
        inp[predictedNotes[i+1]] = 1
        inp[predictedNotes[i+2]] = 1
        out = sess.run(model.prediction, {image: [inp]})
        out = out[0].tolist()
        predictedNotes.append(out.index(max(out)))
    f = open('predictedNotes.txt', 'w')
    f.write(json.dumps(predictedNotes))
    f.close()
    sys.stdout.write("generation done \n")
    sys.stdout.flush()


for i in range(200):
    trainNetwork()
    generateOutput(i)


sess.close()