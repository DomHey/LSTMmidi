const fs = require('fs')
const qs = require('quick-sort')
var sys = require('sys')
var exec = require('child_process').execSync

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
		for (var j = 0; j < notes.length; j++) {
			let note = notes[j]
			newMidiFile += `${note[0]}, ${note[1]}, ${note[2]}, ${note[3]}, ${note[4]}, ${note[5]}\n`
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