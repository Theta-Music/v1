const express = require('express')
const cors = require('cors')
const fetch = require('node-fetch')

const app = express()
const port = 3000

const video_api_key = "" //theta video api - api key
const video_api_secret = "" //theta video api - secret

app.use(express.json())
app.use(cors())

app.get('/', (req, res) => {
  res.send('Hello World!')
})


async function uploadVideo(file_name){
    let [presigned_url,source_upload_id] = await getPresSIgnedUrl()
    await uploadToThetaVideoApi(presigned_url, file_name)
    fs.unlinkSync(file_name)
    let video_id = await transCodeVideo(source_upload_id);
    await getFinalUrlFormVideoAPi(video_id);
    return `https://player.thetavideoapi.com/video/${video_id}`
}


async function uploadToThetaVideoApi(presigned_url, file_name){
 
    let readStream = fs.createReadStream(file_name);

    var options = {
        'method': 'PUT',
        'headers': {
          'Content-Type': 'application/octet-stream'
        },
        body: readStream    
    };
    let response = await fetch(presigned_url, options);
}

async function transCodeVideo(source_upload_id){
    var options = {
        'method': 'POST',
        'headers': {
          'x-tva-sa-id': video_api_key,
          'x-tva-sa-secret': video_api_secret,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({"source_upload_id": source_upload_id,"playback_policy":"public"})
      };
    let response = await fetch('https://api.thetavideoapi.com/video', options);
    return (await response.json()).body.videos[0].id;
}

async function getFinalUrlFormVideoAPi(video_id){
    return new Promise(function(resolve, reject){
        let checkInterval = setInterval(async ()=>{
            var options = {
                'method': 'GET',
                'headers': {
                  'x-tva-sa-id': video_api_key,
                  'x-tva-sa-secret': video_api_secret
                }
              };
              let response = await fetch(`https://api.thetavideoapi.com/video/${video_id}`,options);
              let json_res = await response.json() 
              if(json_res.body.videos[0].playback_uri){
                    clearInterval(checkInterval)
                    resolve(json_res.body.videos[0].playback_uri)
              }
        },1000)
    })  
}

async function getPresSIgnedUrl(){
    var options = {
        'method': 'POST',
        'headers': {
          'x-tva-sa-id': video_api_key,
          'x-tva-sa-secret': video_api_secret
        }
      };
    let response = await fetch('https://api.thetavideoapi.com/upload',options);
    let json_res = await response.json() 
    return [ json_res.body.uploads[0].presigned_url, json_res.body.uploads[0].id];
}

app.post('/addVideo', async (req, res) => {
    if(req.body.videoUrl){
        let video = req.body.video;
        let video_url = await uploadVideo(video);
        return res.json({'url': video_url});
    }
    res.send("");
})


app.listen(port, () => {
    console.log(`http://127.0.0.1:${port}`)
})

