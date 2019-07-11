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
    topics:""
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

  const users=database.ref('/users/'+token);
  const topics=database.ref('/topics');
  return users.once('value').then(function(snapshot){
    topics.push({
  "userId":token,
  "userName":snapshot.val().username,
  "description":data.content,
  "imageUrl":data.image_url,
  "time":new Date().getTime(), 
  "title":data.title,
  "order":0,
  "removed":0,
  "numMessages":0,
  "messages":""
   });
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
  //let order:number=data.order;

  const users=database.ref('/users/'+token);
  const topics=database.ref('/topics/');

  return users.once('value').then(function(snapshot){
    if(snapshot.val()!=null){
      return topics.orderByKey().once('value').then(function(snap){
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
   let numMessages:number=data.numMessages;

   const messages=database.ref('/topics/'+topicId+"/messages");
   const user=database.ref('/users/'+token);
   return user.once('value').then(function(snapshot){
     if(snapshot.val()!=null){
    messages.push({"name":snapshot.val().username,
   "normalizedName":snapshot.val().username,
   "time":new Date().getTime(), 
   "text":data.text,
   "imageUrl":data.imageUrl,
   "votesUp":0,
   "votesDown":0,
   "order":0,
   "removed":0
    });
    database.ref('/topics/'+topicId+"/numMessages").set(numMessages+1).catch(function(error){
    console.log("error "+error);
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
         if(snap.val()!=null){
           if(value>0){
            let votesUp:number=snap.val().votesUp;
            database.ref('/topics/'+topicId+'/messages/'+messageId+'/votesUp').set(votesUp+1).catch((error)=>{
              return 0;
             });
             if(value===-2){
              let votesDown:number=snap.val().votesDown;
              database.ref('/topics/'+topicId+'/messages/'+messageId+'/votesDown').set(votesDown-1).catch((error)=>{
                return 0;
               });
              }
            return {"result":1};
           }else{
            let votesDown:number=snap.val().votesDown;
            database.ref('/topics/'+topicId+'/messages/'+messageId+'/votesDown').set(votesDown+1).catch((error)=>{
              return 0;
             });
             if(value===-2){
              let votesUp:number=snap.val().votesUp;
              database.ref('/topics/'+topicId+'/messages/'+messageId+'/votesUp').set(votesUp-1).catch((error)=>{
                return 0;
               });
             }
             return {"result":1};
           }
         }
         return 0;
       });
     }
     return 0;
  });
  });

  export const unvoteMessage=functions.https.onCall((data, context) => {
  
    let topicId:string=data.topicId;
    let messageId:string=data.messageId;
    let value:number=data.value;
    let token:string=data.token;
    
    const user=database.ref('/users/'+token);
    const message=database.ref('/topics/'+topicId+'/messages/'+messageId)
    return user.once('value').then(function(snapshot){
       if(snapshot.val()!=null){
         return message.once('value').then(function(snap){
           if(snap.val()!=null){
             if(value>0){
              let votesUp:number=snap.val().votesUp;
              if(votesUp!=0){
              database.ref('/topics/'+topicId+'/messages/'+messageId+'/votesUp').set(votesUp-1).catch((error)=>{
                return 0;
               });
               return {"result":1};
              }
              return {"result":0};
             }else{
              let votesDown:number=snap.val().votesDown;
              if(votesDown!=0){
              database.ref('/topics/'+topicId+'/messages/'+messageId+'/votesDown').set(votesDown-1).catch((error)=>{
                return 0;
               });
               return {"result":1};
              }
               return {"result":0};
             }
           }
           return 0;
         });
       }
       return 0;
    });
    });