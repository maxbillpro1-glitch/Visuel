const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const fond = new Image();
fond.src = "modele.png";

let photoUtilisateur = null;

const photoInput = document.getElementById("photo");

photoInput.addEventListener("change", function(e){

    const fichier = e.target.files[0];

    if(!fichier) return;

    const lecteur = new FileReader();

    lecteur.onload = function(evt){

        photoUtilisateur = new Image();

        photoUtilisateur.onload = dessiner;

        photoUtilisateur.src = evt.target.result;

    };

    lecteur.readAsDataURL(fichier);

});

fond.onload = dessiner;

function dessiner(){

    ctx.clearRect(0,0,1080,1350);

    if(photoUtilisateur){

        dessinerPhoto();

    }

    ctx.drawImage(fond,0,0,1080,1350);

    dessinerQRCode();

}

function dessinerPhoto(){

    const zoneX = 0;
    const zoneY = 0;

    const zoneLargeur = 1080;
    const zoneHauteur = 690;

    const ratioImage = photoUtilisateur.width/photoUtilisateur.height;
    const ratioZone = zoneLargeur/zoneHauteur;

    let sx,sy,sWidth,sHeight;

    if(ratioImage>ratioZone){

        sHeight = photoUtilisateur.height;
        sWidth = sHeight*ratioZone;

        sx=(photoUtilisateur.width-sWidth)/2;
        sy=0;

    }

    else{

        sWidth=photoUtilisateur.width;
        sHeight=sWidth/ratioZone;

        sx=0;
        sy=(photoUtilisateur.height-sHeight)/2;

    }

    ctx.drawImage(

        photoUtilisateur,

        sx,
        sy,
        sWidth,
        sHeight,

        zoneX,
        zoneY,
        zoneLargeur,
        zoneHauteur

    );

}

function dessinerQRCode(){

    const temp=document.createElement("div");

    new QRCode(temp,{

        text:window.location.href,

        width:120,

        height:120

    });

    setTimeout(()=>{

        const qr=temp.querySelector("img");

        if(qr){

            const img=new Image();

            img.onload=function(){

                ctx.fillStyle="white";

                ctx.fillRect(900,1180,140,140);

                ctx.drawImage(img,910,1190,120,120);

            }

            img.src=qr.src;

        }

    },100);

}

document.getElementById("download").onclick=function(){

    const lien=document.createElement("a");

    lien.download="Mon_affiche.png";

    lien.href=canvas.toDataURL("image/png");

    lien.click();

}
