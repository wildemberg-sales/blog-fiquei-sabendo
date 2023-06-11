const express = require('express');
const path = require('path');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
const { ServerApiVersion } = require('mongodb');
var session = require('express-session');
const fileUpload = require('express-fileupload');
const fs = require('fs');
// const multer = require('multer');

const app = express();

app.use(fileUpload());

const Posts = require('./posts.js');

// Conectando ao mongodb com o mongoose, lembre de colocar o nome da DB aqui debaixo antes do ?
const uri = "mongodb+srv://Will:junior321@cluster0.ifottyy.mongodb.net/cursodankicode?retryWrites=true&w=majority";
mongoose.connect(uri,{ useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 }).then(()=>{
    console.log('Conectado com sucesso ao DB');
}).catch((err)=>{
    console.log(err.message); 
})

app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({   // to suport URL-encoded bodies
    extended: true
}));

// usando express session para persistencia de login
// o secret 
app.use(session({secret: 'fl5452gv345fg52345', cookie: { maxAge: 60000 }}))

// setar a engine para renderização html, e vou usar o ejs para renderizar
app.engine('html', require('ejs').renderFile);

// seta a view engine para ser html
app.set('view engine', 'html');

// o diretorio estatico onde fica video, fotos, arquivos, css, na pasta public
app.use('/public', express.static(path.join(__dirname, 'public')));

// indica onde está a pasta onde está as views
app.set('views', path.join(__dirname, '/pages'));

app.get('/', (req, res)=>{

    //verifica se está sendo feita alguma busca, e renderiza condicionalmente
    if(req.query.busca == null){
        Posts.find({}).sort({'_id':-1}).exec((err,posts)=>{
            // console.log(posts[0]);
            posts = posts.map(val=>{
                return{
                    titulo: val.titulo,
                    conteudo: val.conteudo,
                    descricaoCurta: val.conteudo.substr(0,100),
                    imagem: val.imagem,
                    slug: val.slug,
                    categoria: val.categoria,
                    autor: val.autor,
                }
            })

            Posts.find({}).sort({'views': -1}).limit(3).exec(function(err,postsTop){

                postsTop = postsTop.map(function(val){
                    return {
                        titulo: val.titulo,
                        conteudo: val.conteudo,
                        descricaoCurta: val.conteudo.substr(0,100),
                        imagem: val.imagem,
                        slug: val.slug,
                        categoria: val.categoria,
                        autor: val.autor,
                        views: val.views
                    }
                })

                res.render('home',{posts:posts,postsTop:postsTop});

             })
        })
        
    }else{

        Posts.find({titulo: {$regex: req.query.busca, $options: "i"}}, (err,posts)=>{
            posts = posts.map(val=>{
                return{
                    titulo: val.titulo,
                    conteudo: val.conteudo,
                    descricaoCurta: val.conteudo.substr(0,100),
                    imagem: val.imagem,
                    slug: val.slug,
                    autor: val.autor,
                    categoria: val.categoria
                }
            })
            res.render('busca',{posts: posts, contagem: posts.length})
        })

    }

});

app.get('/:slug', (req, res)=>{

    Posts.findOneAndUpdate({slug: req.params.slug}, {$inc : {views: 1}}, {new: true}, (err, resposta)=>{

        Posts.find({}).sort({'views': -1}).limit(3).exec(function(err,postsTop){

            postsTop = postsTop.map(function(val){
                return {
                    titulo: val.titulo,
                    conteudo: val.conteudo,
                    descricaoCurta: val.conteudo.substr(0,100),
                    imagem: val.imagem,
                    slug: val.slug,
                    categoria: val.categoria,
                    autor: val.autor,
                    views: val.views
                }
            })
            res.render('single',{noticia:resposta, postsTop:postsTop})
         })
        
    })
});

var users = [
    {
        login: 'will',
        senha: '1234'
    }
]

// consegue usar o post por causa do bodyParser
app.post('/admin/login', (req, res)=>{
    users.map((val)=>{
        if(val.login == req.body.login && val.senha == req.body.senha){
            req.session.login = req.body.login;
        }
    });

    res.redirect('/admin/login');
});



app.post('/admin/cadastro', (req,res)=>{

   // Ajustando o local de gravação e o nome
    let formato = req.files.arquivo.name.split('.');
    var imagem = "";
    
    if(formato[formato.length-1] == "jpg" || "png" || "jpeg"){
        imagem = new Date().getTime() + formato[formato.length-1];
        req.files.arquivo.mv(__dirname + '/public/images/' + imagem);
        
    }else{
        fs.unlinkSync(req.files.tempFilePath)
    }

    //Insere no banco de dados
    Posts.create({
        titulo: req.body.titulo_noticia,
        imagem: 'http://localhost:5000/public/images/' + imagem,
        categoria: req.body.categoria,
        conteudo: req.body.noticia,
        slug: req.body.slug,
        autor: req.body.autor,
        views: 0
    })
    res.redirect('/admin/login');
    
});

app.get('/admin/deletar/:id', (req,res)=>{
    Posts.deleteOne({_id:req.params.id}).then(()=>{
        res.redirect('/admin/login');
    });  
});

app.get('/admin/login', (req, res)=>{
    if(req.session.login == null){
        res.render('admin-login', {});
        
    }else{
        Posts.find({}).sort({'_id':-1}).exec((err,posts)=>{
            posts = posts.map(val=>{
                return{
                    id: val._id,
                    titulo: val.titulo,
                    conteudo: val.conteudo,
                    descricaoCurta: val.conteudo,
                    imagem: val.imagem,
                    slug: val.slug,
                    categoria: val.categoria
                }
            })

            res.render('admin-panel', {posts:posts});
        })
        
    }
});

//iniciar servidor
app.listen(5000, ()=>{
    console.log('Servidor iniciado');
});



