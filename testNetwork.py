import numpy as np
import tensorflow as tf
import sys

trainingInputs = [
[1.,0.,0.,0.],
[0.,1.,0.,0.],
[0.,0.,1.,0.],
[0.,0.,0.,1.],
[0.,0.,0.,0.]]
trainingOutputs = [
[1.,0.,0.,0.,0.],
[0.,1.,0.,0.,0.],
[0.,0.,1.,0.,0.],
[0.,0.,0.,1.,0.],
[0.,0.,0.,0.,1.]]

data = tf.placeholder(tf.float32, [None, len(trainingInputs[0])])
target = tf.placeholder(tf.float32, [None, len(trainingOutputs)])
num_hidden = 24
cell = tf.contrib.rnn.LSTMCell(num_hidden,state_is_tuple=True)
val, _ = tf.nn.dynamic_rnn(cell, data, dtype=tf.float32)
last = tf.gather(val, int(val.get_shape()[0]) - 1)
weight = tf.Variable(tf.truncated_normal([num_hidden, int(target.get_shape()[1])]))
bias = tf.Variable(tf.constant(0.1, shape=[target.get_shape()[1]]))
prediction = tf.nn.softmax(tf.matmul(last, weight) + bias)
cross_entropy = -tf.reduce_sum(target * tf.log(tf.clip_by_value(prediction,1e-10,1.0)))
optimizer = tf.train.GradientDescentOptimizer(0.01)
minimize = optimizer.minimize(cross_entropy)
mistakes = tf.not_equal(tf.argmax(target, 1), tf.argmax(prediction, 1))
error = tf.reduce_mean(tf.cast(mistakes, tf.float32))

init_op = tf.initialize_all_variables()
sess = tf.Session()
sess.run(init_op)

batch_size = 1
no_of_batches = int((len(trainingInputs)) / batch_size)

def trainNetwork():
    epoch = 10
    for i in range(epoch):
        ptr = 0
        for j in range(no_of_batches):
            inp, out = trainingInputs[ptr:ptr+batch_size], trainingOutputs[ptr:ptr+batch_size]
            ptr+=batch_size
            _, cross_entropy_py = sess.run([minimize, cross_entropy],feed_dict={data:inp,target:out})
            sys.stdout.write(np.array_str(cross_entropy_py.astype('str')))
            sys.stdout.flush()


def generateOutput():
    incorrect = sess.run(error,{data: trainingInputs, target: trainingOutputs})
    sys.stdout.write('error {:3.1f}%'.format(100 * incorrect) + "\n")
    sys.stdout.flush()

for i in range(1):
    trainNetwork()
    generateOutput()

sess.close()