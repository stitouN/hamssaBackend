import * as functions from 'firebase-functions';

// Firebase Setup
import * as admin from 'firebase-admin';
//import * as storage from '@google-cloud/firestore';

 
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://hamssa-47630.firebaseio.com"
  });
let database=admin.database();


function validateLogin(name:string):number{
  let letterNumber= /[a-z0-9]/;
  if(name.length<4){
    return 1;
  }else if(name.length>=16){
    return 2;
  }else if(!name.match(letterNumber)){
    return 3;
  }
  return 0;
}


export const createUser= functions.https.onCall((data, context) => {
  let name:string=data.name;
  let language=data.language;
  let notifToken:string=data.notificationToken;
  const users=database.ref('/users/');
  let token:string="";
  name=name.trim().toLowerCase();
  return users.orderByChild("username").equalTo(name).once('value').then(function(snapshot){
    console.log("run");
    let validate=validateLogin(name);
    if(validate!==0){
      return {
        "user_id":name,
        "error":validate
       };
    }
    else if(snapshot.val()==null){
    //const token=crypto.randomBytes(16).toString('hex');
    let ref=users.push();
    token=ref.key==null?"":ref.key;
    ref.set({
    username:name,
    language:language,
    password:"",
    email:"",
    imageUrl:"",
    notificationToken:notifToken,
    notified:true
    }).catch((error)=>{
      return 0;
     });
    return {
   "result":1,
   "user_id":name,
   "user_token":token
    };
 }else {
   console.log("utilisateur existe deja: "+name);
   return {
    "user_id":name,
    "error":4
   };
   }
  }) .catch((error)=>{
   return 0;
  });
}); 

export const getMyUserInfo=functions.https.onCall((data, context) => {
  let token:string=data.token;
  const users=database.ref('/users/'+token);
  return users.once('value').then(function(snapshot){
    if(snapshot.val()!==null){
      let result=snapshot.val();
      result.user_id=token;
      result.user_token=token;
      return result;
    }
   return 0;
  });
  });

export const setEmail=functions.https.onCall((data, context) => {
  let token=data.token;
  let email=data.email;
  database.ref('/users/'+token+'/email').set(email).catch((error)=>{
    return 0;
   });
  return database.ref('/users/'+token).once('value').then(function(snapshot){
    if(snapshot.val()!=null){
      let result=snapshot.val();
      result.user_id=token;
      result.user_token=token;
      return result;
    }
    return 0;
    });
});
export const createTopic=functions.https.onCall((data, context) => {
  //let name:string=req.body.user_id;
  let token:string=data.token;
  let audioRate:number=data.audioRate?data.audioRate:0;
  let audioDuration:number=data.audioDuration?data.audioDuration:0;
  let topicId:string=data.topicId?data.topicId:"";

  const users=database.ref('/users/'+token);
  const topics=database.ref('/topics');
  return users.once('value').then(function(snapshot)
  {
    if(topicId===""){ 
    topics.push({
  "userId":token,
  "userName":snapshot.val().username,
  "description":data.content,
  "color":data.color,
  "imageUrl":data.image_url,
  "audioUrl":data.audioUrl,
  "audioRate":audioRate,
  "audioDuration":audioDuration,
  "time":new Date().getTime(), 
  "order":0,
  "removed":0,
  "numMessages":0,
  "messages":"",
  "likes":"",
  "pending":true,
  "notificationToken":data.notificationToken
   });
  }else{
    database.ref('/topics/'+topicId+'/description').set(data.content).catch((error)=>{
      return 0;
     });
     database.ref('/topics/'+topicId+'/imageUrl').set(data.image_url).catch((error)=>{
      return 0;
     });
  }
   return topics.once('value').then(function(snap){
    if(snap.val()!=null){
      return snap.val();
    }
    return 0;
    }); 
  });
  
});

export const getTopics=functions.https.onCall((data, context) => {
  //let name:string=data.user_id;
  let token:string=data.token;
  let index:number=data.position?data.position:0;

  const users=database.ref('/users/'+token);
  const topics=database.ref('/topics/');

  return users.once('value').then(function(snapshot){
    if(snapshot.val()!=null){
      return topics.orderByKey().limitToLast(index+6).once('value').then(function(snap){
        if(snap.val()!=null){
         return snap.val();
        }
        return 0;
      });
    }
    return 0;
    });

});

export const getTopicByUser=functions.https.onCall((data,context) => {
  let token:string=data.token;
  const topic=database.ref('/topics/');
  return topic.orderByChild("userId").equalTo(token).once('value').then(function(snapshot){
    if(snapshot!=null){
      return snapshot.val();
    }
    return 0;
    });

});

export const removeTopic=functions.https.onCall((data, context) => {
  let token:string=data.token;
  let topicId:string=data.topicId;
  const topic=database.ref('/topics/'+topicId+'/removed');
  const topics=database.ref('/topics/');
  const user=database.ref('/users/'+token);
 return user.once('value').then(function(snapshot){
  if(snapshot.val()!=null){
    topic.set(1).catch((error)=>{
      return 0;
     });
    return topics.once('value').then(function(snap){
      if(snap.val()!=null){
        return snap.val();
      }
      return 0;
      }); 
  
}
return 0;
}).catch(function(error){
  console.log("Remove failed :"+error.message);
});

});

export const createMessage=functions.https.onCall((data, context) => {
   //let name:string=req.body.user_id;
   let token:string=data.token;
   let topicId:string=data.topicId;

   const messages=database.ref('/topics/'+topicId+"/messages");
   const user=database.ref('/users/'+token);
   return user.once('value').then(function(snapshot){
     if(snapshot.val()!=null){
    messages.push({"name":snapshot.val().username,
   "normalizedName":token,
   "time":new Date().getTime(), 
   "text":data.text,
   "imageUrl":data.imageUrl,
   "votesUp":"",
   "votesDown":"",
   "order":0,
   "removed":0,
   "notificationToken":data.notificationToken
    });
    database.ref('/topics/'+topicId).once('value').then(function(snap){
      if(snap.val()!==null){
       let numMessages=snap.val().numMessages+1; 
       database.ref('/topics/'+topicId+"/numMessages").set(numMessages+1).catch(function(error){
        console.log("error lors la mise à jour du numMessages "+error);
        });
      }
   
    }).catch(function(error){
      console.error(error);
    });
    
   return user.once('value').then(function(snap){
     if(snap.val()!=null){
       return snap.val();
     }
     return 0;
     }); 
    }
    return 0;
    });

});

export const getMessages=functions.https.onCall((data, context) => {

let topicId:string=data.topicId;
let token:string=data.token;

const user=database.ref('/users/'+token);
const messages=database.ref('/topics/'+topicId+'/messages')
return user.once('value').then(function(snapshot){
   if(snapshot.val()!=null){
     return messages.once('value').then(function(snap){
       if(snap.val()!=null){
         return snap.val();
       }
       return 0;
     });
   }
   return 0;
});
});

export const voteMessage=functions.https.onCall((data, context) => {
  
  let topicId:string=data.topicId;
  let messageId:string=data.messageId;
  let value:number=data.value;
  let token:string=data.token;
  
  const user=database.ref('/users/'+token);
  const message=database.ref('/topics/'+topicId+'/messages/'+messageId)
  return user.once('value').then(function(snapshot){
     if(snapshot.val()!=null){
       return message.once('value').then(function(snap){
        let likes;   
        if(snap.val()!=null){
           if(value>0){
             let votesUpValue:string=snap.val().votesUp;
            if(snap.val().votesUp!=="" && votesUpValue.search(snapshot.val().username)==-1){
                   likes=votesUpValue+snapshot.val().username+',';
            }else if(votesUpValue.search(snapshot.val().username)!==-1){
                   let likesTab=votesUpValue.split(snapshot.val().username+",");
                   likes=likesTab[0]+likesTab[1];
            } else{
                   likes=snapshot.val().username+',';
            }
            database.ref('/topics/'+topicId+'/messages/'+messageId+'/votesUp').set(likes).catch(function(error){
              console.error(error);
            });
            console.log("le nombre de likes est : "+likes);
            return {"result":1};
           }else{
            if(snap.val().votesDown!=="" && snap.val().votesDown.search(snapshot.val().username)==-1){
              likes=snap.val().votesDown+snapshot.val().username+',';
            }else if(snap.val().votesDown.search(snapshot.val().username)!==-1){
              let likesTab=snap.val().votesDown.split(snapshot.val().username+",");
              likes=likesTab[0]+likesTab[1];
            } else{
              likes=snapshot.val().username+',';
            }
          database.ref('/topics/'+topicId+'/messages/'+messageId+'/votesDown').set(likes).catch(function(error){
          console.error(error);
          });
             return snap.val();
           }
         }
         return 0;
       });
     }
     return 0;
  });
  });

    export const voteTopic=functions.https.onCall((data, context) => {
  
      let topicId:string=data.topicId;
      let token:string=data.token;
      
      const user=database.ref('/users/'+token);
      const topic=database.ref('/topics/'+topicId);
      return user.once('value').then(function(snapshot){
         if(snapshot.val()!=null){
          return topic.once('value').then(function(snap){
            let likes; 
            let likesValue:string=snap.val().likes;    
            if(likesValue!=="" && likesValue.search(snapshot.val().username)==-1){
                   likes=likesValue+snapshot.val().username+',';
                 }else if(likesValue.search(snapshot.val().username)!==-1){
                   let likesTab=likesValue.split(snapshot.val().username+",");
                   likes=likesTab[0]+likesTab[1];
                 } else{
                   likes=snapshot.val().username+',';
                 }
                 console.log("le nombre de likes est : "+likes);
                 database.ref('/topics/'+topicId+"/likes").set(likes).catch((error)=>{
                  return 0;
                 });
                 return snap.val();   
          });
        }
         return {"result":0};
      });
      });
    
      /**
 * Triggers when a user gets a new follower and sends a notification.
 *
 * Followers add a flag to `/followers/{followedUid}/{followerUid}`.
 * Users save their device notification tokens to `/users/{followedUid}/notificationTokens/{notificationToken}`.
 */
 export const sendFollowerNotification = functions.database.ref('/topics/{topicId}/messages/{messageId}')
.onWrite(async (change, context) => {
  
  const topicId=context.params.topicId;
  const messageId=context.params.messageId;
  const getTopic=database.ref('/topics/'+topicId).once('value');
  const getUsersIds=database.ref('/topics/'+topicId+'/messages').once('value');
  const getMessage=database.ref('/topics/'+topicId+'/messages/'+messageId).once('value');
  
  const results=await Promise.all([getTopic,getUsersIds,getMessage]);
  console.log("l'id de message est "+messageId);
  console.log("l'id du topic est "+topicId);
  let messages=results[1];
  console.log("valeur du message est "+results[2].val().text);
  // Notification details.
 const payload = {
  notification: {
    title: 'Nouveau commentaire',
    body:results[2].val().text,
  }
 };

 let tokens:Array<string>=[results[0].val().notificationToken];
console.log("notification token est "+results[0].val().notificationToken);
 messages.forEach(function(item) {
    var itemVal = item.val();
   if(results[0].val().userName!==itemVal.normalizedName && itemVal.notificationToken!==results[0].val().notificationToken){
      tokens.push(itemVal.notificationToken);
    }

 });

 await admin.messaging().sendToDevice([results[0].val().notificationToken], payload);

 await admin.messaging().sendToDevice( Object.keys(tokens), payload);
 
});

export const createAnonymousUser=functions.https.onCall((data, context) => {
  //let name:string=data.user_id;
  let uid:string=data.token;
  let notifToken:string=data.notificationToken;
  
  let name:string;
  
  const users=database.ref('/users/');
  let names=database.ref('/names/');
  
  return names.once('value').then(async function(snapshot){
  let found:boolean=false;
  let noms:string=snapshot.val().nom;
  let prenoms:string=snapshot.val().prenom;
  let usedCombin:string=snapshot.val().usedCombin;
  let nomsTable=noms.split(",");
  let prenomsTable=prenoms.split(",");
  
  while(!found){
    let indexNom=Math.floor(Math.random() * nomsTable.length) ;  
    let indexPrenom=Math.floor(Math.random() * nomsTable.length);
    if(!usedCombin.includes(indexNom+""+indexPrenom)){
      name=nomsTable[indexNom]+"_"+prenomsTable[indexPrenom];
      found=true;
    
     await addUsedCombination(indexNom+""+indexPrenom);
     
    }
    console.log(name);
  }
  
  let ref=users.push();
  let token=ref.key==null?"":ref.key;
  console.log("the token is "+token);
 
    if(snapshot.val()!=null){
      ref.set({
        username:name,
        language:"",
        password:"",
        uid:uid,
        notificationToken:notifToken,
        notified:true
        }).catch((error)=>{
          return 0;
         });
        return {
          "result":1,
          "user_id":name,
          "user_token":token
           };
      
    }
    return 0;
  }
);
});
   
async function addUsedCombination(chaine:string){
  let ref= database.ref("/names/usedCombin");
  ref.once('value').then(function(snapshot){
    let usedCombinValue=snapshot.val();
    console.log("la valeur de la chaine "+chaine);
    console.log("la valeur du champ du combinaison "+usedCombinValue);
    database.ref("/names/usedCombin").set(usedCombinValue+chaine+",").catch((error)=>{
      console.error("la valeur usedCombin est mal enregistrée "+chaine);
      return 0;
     });
  }).catch((error)=>{
    console.error("la valeur usedCombin est mal enregistrée "+chaine);
      return 0;
  });
}