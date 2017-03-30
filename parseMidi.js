const fs = require('fs')
const qs = require('quick-sort')
var sys = require('sys')
var exec = require('child_process').execSync
let globalIOKeys = []
let trainingsSet = []

var walk = function(dir, done) {
  var results = []
  fs.readdir(dir, function(err, list) {
    if (err) return done(err)
    var i = 0;
    (function next() {
      var file = list[i++]
      if (!file) return done(null, results);
      file = dir + '/' + file
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res)
            next()
          })
        } else {
          results.push(file)
          next()
        }
      })
    })();
  })
}


walk("./originalMidi", function(err, results) {
  if (err) throw err
  for (var i = results.length - 1; i >= 0; i--) {
  	path = results[i]
  	if(path.indexOf(".mid") == -1) continue;
  	var out = exec(`midicsv ${path}`)
  	createCSVMidi(path, out.toString('utf-8'))
  }
  generateTrainingSet()
})

function createCSVMidi(path, text) {
	let midiText = text
	let midiLines = midiText.split("\n")
	let finalMidiLines = {}
	let headerSpeed = midiLines[0]
	headerSpeed = parseInt(headerSpeed.split(",")[5])

	for (var i = 0; i < midiLines.length; i++) {
		let line = midiLines[i]
		if(line.indexOf("Note") == -1) {
			continue
		}
		let parts = line.split(",")
		let temp = []
		temp.push(1)
		temp.push(parts[1])
		temp.push(parts[2])
		temp.push(parts[3])
		temp.push(parts[4])
		temp.push(parts[5])

		let tempArray = []

		if(finalMidiLines[parseInt(parts[1])]) {
			tempArray = JSON.parse(finalMidiLines[parseInt(parts[1])].notes)
		} else {
			finalMidiLines[parseInt(parts[1])] = JSON.parse('{"notes": []}')
		}

		tempArray.push(temp)
		finalMidiLines[parseInt(parts[1])].notes = JSON.stringify(tempArray)
	}

	let keys = Object.keys(finalMidiLines)
	let newMidiFile = `0, 0, Header, 1, 1, ${headerSpeed}\n1, 0, Start_track\n`
	for (var i = 0; i < keys.length; i++) {
		let notes = JSON.parse(finalMidiLines[keys[i]].notes)
		let IOLine = ""
		for (var j = 0; j < notes.length; j++) {
			let note = notes[j]

			IOLine +=encodeMidiNote(note, i, keys)

			newMidiFile += `${note[0]}, ${note[1]}, ${note[2]}, ${note[3]}, ${note[4]}, ${note[5]}\n`
		}
		IOLine = IOLine.substr(0,IOLine.length-1)
		if(globalIOKeys.indexOf(IOLine) == -1) {
			globalIOKeys.push(IOLine)
		}
	}

	newMidiFile+=`1, ${keys[keys.length-1]}, End_track\n0, 0, End_of_file`

	let oldFilename = path.split("/")
	oldFilename = oldFilename[oldFilename.length-1]
	console.log(oldFilename)
	let newPath = path.replace(oldFilename, `${oldFilename.split(".")[0]}.txt`)

	fs.writeFileSync(`./convertedMidi/${oldFilename.split(".")[0]}.txt`, newMidiFile)
	exec(`csvmidi "convertedMidi/${oldFilename.split(".")[0]}.txt" "convertedMidi/${oldFilename.split(".")[0]}.mid"`)
}

function encodeMidiNote(note, i, keys) {
	let IOTick = 0
	let IOCindi = 0
	let IONote = 0
	let IOVelo = 0

	if(i == 0) {
		IOTick = pad(parseInt(keys[i]))
	} else {
		let oldIOTick = parseInt(keys[i-1])
		let currentIOtick = parseInt(keys[i])
		IOTick = pad(currentIOtick-oldIOTick)
	}

	if(note[2].indexOf("on") != -1) {
		IOCindi = pad(1)
	} else {
		IOCindi = pad(2)
	}

	IONote = pad(parseInt(note[4]))
	IOVelo = pad(parseInt(note[5]))

	return `${IOTick}|${IOCindi}|${IONote}|${IOVelo}|`
}

function generateTrainingSet() {
	walk("./convertedMidi", function(err, results) {
	  if (err) throw err
	  for (var i = results.length - 1; i >= 0; i--) {
	  	path = results[i]
	  	if(path.indexOf(".txt") == -1) continue;
	  	parseTextMidi(path)
	  }
	  console.log(trainingsSet)
	})
}

function parseTextMidi(path) {
	let midiText = fs.readFileSync(path, "UTF-8")
	let finalMidiLines = {}
	let midiLines = midiText.split('\n')
	for (var i = 0; i < midiLines.length; i++) {
		let line = midiLines[i]
		if(line.indexOf("Note") == -1) {
			continue
		}
		let parts = line.split(",")
		let temp = []
		temp.push(1)
		temp.push(parts[1])
		temp.push(parts[2])
		temp.push(parts[3])
		temp.push(parts[4])
		temp.push(parts[5])

		let tempArray = []

		if(finalMidiLines[parseInt(parts[1])]) {
			tempArray = JSON.parse(finalMidiLines[parseInt(parts[1])].notes)
		} else {
			finalMidiLines[parseInt(parts[1])] = JSON.parse('{"notes": []}')
		}

		tempArray.push(temp)
		finalMidiLines[parseInt(parts[1])].notes = JSON.stringify(tempArray)
	}

	let keys = Object.keys(finalMidiLines)


	for (var i = 0; i <= keys.length-4; i++) {
		let noteArray1 = JSON.parse(finalMidiLines[keys[i]].notes)
		let noteArray2 = JSON.parse(finalMidiLines[keys[i+1]].notes)
		let noteArray3 = JSON.parse(finalMidiLines[keys[i+2]].notes)
		let noteArray4 = JSON.parse(finalMidiLines[keys[i+3]].notes)

		let key1 = ""
		for (var j = 0; j < noteArray1.length; j++) {
			key1+= encodeMidiNote(noteArray1[j], i, keys)
		}
		key1 = key1.substr(0,key1.length-1)

		let key2 = ""
		for (var j = 0; j < noteArray2.length; j++) {
			key2+= encodeMidiNote(noteArray2[j], (i+1), keys)
		}
		key2 = key2.substr(0,key2.length-1)

		let key3 = ""
		for (var j = 0; j < noteArray3.length; j++) {
			key3+= encodeMidiNote(noteArray3[j], (i+2), keys)
		}
		key3 = key3.substr(0,key3.length-1)

		let key4 = ""
		for (var j = 0; j < noteArray4.length; j++) {
			key4+= encodeMidiNote(noteArray4[j], (i+3), keys)
		}
		key4 = key4.substr(0,key4.length-1)

		let inputArray = []

		inputArray.push(globalIOKeys.indexOf(key1))
		inputArray.push(globalIOKeys.indexOf(key2))
		inputArray.push(globalIOKeys.indexOf(key3))

		let outputArray = []
		outputArray.push(globalIOKeys.indexOf(key4))

		let temp = [inputArray, outputArray]
		trainingsSet.push(temp)

	}
}


function pad(n) {
	if(n < 10) {
		return "00" +n
	}

	if(n < 100) {
		return "0" +n
	}

	return n
}