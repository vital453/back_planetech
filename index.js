var express = require("express");
var mysql = require("mysql");
var cors = require("cors");
var bodyparser = require("body-parser");
var app = express();
const multer = require("multer");
const path = require("path");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const saltRounds = 10;

const jwt = require("jsonwebtoken");

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

app.use(cors({ header: { "Access-Control-Allow-Origin": "*" } }));
app.use(express.json());
app.use(cookieParser());
app.use(bodyparser.urlencoded({ extended: true }));
app.use(bodyparser.json());

app.use(
  session({
    key: "userId",
    secret: "subscribe",
    resave: false,
    saveUninitialized: false,
    cookie: {
      expires: 60 * 60 * 24,
    },
  })
);

app.listen("3004", () => {
  console.log("server is running....");
});

// mysql database connection
const db = mysql.createConnection({
  user: "root",
  host: "localhost",
  password: "",
  database: "planetech",
});

// check db connection
db.connect((err) => {
  if (err) throw err;
  else {
    console.log("database connected ....");
  }
});

app.get("/", (req, res) => {
  res.json({ message: "OKAY" });
  console.log("server is running....");
});

//all users
app.get("/alluser", (req, res) => {
  db.query("SELECT * FROM user", (err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.send(result);
    }
  });
});

//registration
app.post("/register", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  let idmax = 0;
  db.query(
    "SELECT * FROM user WHERE username = ? ",
    username,
    (err, result) => {
      // if(err){
      //   console.log(err);
      //   res.send({ err: err});

      // }
      //   res.send(result);
      if (result.length > 0) {
        res.json({
          regist: false,
          message: "Ce nom d'utilisateur existe déjà !",
        });
      } else {
        bcrypt.hash(password, saltRounds, (err, hash) => {
          if (err) {
            console.log(err);
          }

          db.query(
            "INSERT INTO user (username, password) VALUES (?,?)",
            [username, hash],
            (err, result) => {
              if (err) {
                console.log(err);
              } else {
                //  res.send("Values Inserted");
                db.query("SELECT  MAX(id) AS id FROM user ", (err, result) => {
                  if (err) {
                    console.log(err);
                  } else {
                    //res.send(result);
                    idmax = result[0].id;
                    db.query(
                      "insert into caisse (id, caisse) values (?,?)",
                      [idmax, 0],
                      (err, result) => {
                        if (!err) {
                          res.send("success");
                        } else {
                          console.log(err);
                        }
                      }
                    );
                  }
                });
              }
            }
          );
        });
      }
    }
  );
});
//login
app.post("/login", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  db.query("SELECT * FROM user WHERE username = ?", username, (err, result) => {
    if (err) {
      //   console.log(err);
      res.send({ err: err });
    }
    //   res.send(result);
    if (result.length > 0) {
      bcrypt.compare(password, result[0].password, (error, response) => {
        if (response) {
          const id = result[0].id;
          const token = jwt.sign({ id }, "jwtSecret", {
            expiresIn: 60000000000000000000,
          });
          req.session.user = result;

          req.session.user = result;

          // res.send(result);
          res.json({
            auth: true,
            token: token,
            id: result[0].id,
            username: result[0].username,
          });
        } else {
          // res.send({ message: "Mauvaise combinaison"})
          res.json({ auth: false, message: "Mauvaise combinaison" });
        }
      });
    } else {
      res.json({ auth: false, message: "L'utilisateur n'existe pas" });
      // res.send({ message: "L'utilisateur n'existe pas"});
    }
  });
});
// verification de l'authenticiter du token

const verifyJWT = (req, res, next) => {
  const token = req.headers["x-access-token"];

  if (!token) {
    res.send("Nous avons besoin du token, donnez le nous prochainement!");
  } else {
    jwt.verify(token, "jwtSecret", (err, decoded) => {
      if (err) {
        res.json({ auth: false, message: "Connexion expirée" });
      } else {
        req.userId = decoded.id;
        next();
      }
    });
  }
};

app.get("/isUserAuth", verifyJWT, (req, res) => {
  res.send("Vous etes authentifier");
});

//crée categories
app.post("/addcategory", (req, res) => {
  const name = req.body.name;
  // const description = req.body.description;
  db.query("INSERT INTO category (nom) VALUES (?,?)", [name], (err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.send("succes");
    }
  });
});

//Liste libellé statut
app.get("/affichelibstat", (req, res) => {
  db.query("SELECT * FROM statuscommande", (err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.send(result);
    }
  });
});
//Liste category
app.get("/affichecategorie", (req, res) => {
  db.query("SELECT * FROM category", (err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.send(result);
    }
  });
});
//Liste des sous category
app.get("/affichesub_category", (req, res) => {
  db.query("SELECT * FROM sub_category", (err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.send(result);
    }
  });
});
//Liste des sous sous category
app.get("/affichesub_sub_category", (req, res) => {
  db.query("SELECT * FROM sub_sub_category", (err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.send(result);
    }
  });
});
// ajout de produit
app.post("/add_product", async (req, res) => {
  const seller_id = req.body.seller_id;
  const nom = req.body.nom;
  const description = req.body.description;
  const categorieid = req.body.categorieid;
  const souscategorieid = req.body.souscategorieid;
  const sous_soucategorieid = req.body.sous_soucategorieid;
  const prix_achat = req.body.prix_achat;
  const prix_vente = req.body.prix_vente;
  const stock = req.body.stock;
  const discount_value = req.body.discount_value;
  const discount_type = req.body.discount_type;
  const picture1 =
    "C:/Users/Vital/planetech_project/back_planetech/uploads/wallpaperflare.com_wallpaper(13).jpg";
  db.query(
    "INSERT INTO product (name, description, purchase_price, selling_price, picture1, id_category, id_sub_category, id_sub_sub_category, discount_type, stock, seller_id, discount_value) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
    [
      nom,
      description,
      prix_achat,
      prix_vente,
      picture1,
      categorieid,
      souscategorieid,
      sous_soucategorieid,
      discount_type,
      stock,
      seller_id,
      discount_value,
    ],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        //res.send("suc");
        db.query("SELECT  MAX(id) AS id FROM product ", (err, result) => {
          if (err) {
            console.log(err);
          } else {
            res.send(result);
          }
        });
      }
    }
  );
});

//Liste des produits
app.get("/affiche_produit", (req, res) => {
  db.query("SELECT * FROM product", (err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.send(result);
    }
  });
});

//insertion des images

app.put("/insert_image/:id/:stat", async (req, res) => {
  const id = req.params.id;
  const stat = req.params.stat;
  // 'avatar' is the name of our file input field in the HTML form
  let upload = multer({ storage: storage }).single("avatar");

  upload(req, res, function (err) {
    // req.file contains information of uploaded file
    // req.body contains information of text fields

    if (!req.file) {
      return res.send("Please select an image to upload");
    } else if (err instanceof multer.MulterError) {
      return res.send(err);
    } else if (err) {
      return res.send(err);
    }
    let classifiedsadd = {
      picture1:
        "C:/Users/Vital/planetech_project/back_planetech/uploads/" +
        req.file.filename,
    };
    if (stat == 1) {
      classifiedsadd = {
        picture1:
          "C:/Users/Vital/planetech_project/back_planetech/uploads/" +
          req.file.filename,
      };
    }
    if (stat == 2) {
      classifiedsadd = {
        picture2:
          "C:/Users/Vital/planetech_project/back_planetech/uploads/" +
          req.file.filename,
      };
    }
    if (stat == 3) {
      classifiedsadd = {
        picture3:
          "C:/Users/Vital/planetech_project/back_planetech/uploads/" +
          req.file.filename,
      };
    }
    if (stat == 4) {
      classifiedsadd = {
        picture4:
          "C:/Users/Vital/planetech_project/back_planetech/uploads/" +
          req.file.filename,
      };
    }
    if (stat == 5) {
      classifiedsadd = {
        picture5:
          "C:/Users/Vital/planetech_project/back_planetech/uploads/" +
          req.file.filename,
      };
    }
    if (stat == 6) {
      classifiedsadd = {
        picture6:
          "C:/Users/Vital/planetech_project/back_planetech/uploads/" +
          req.file.filename,
      };
    }

    //	const sql = "UPDATE products SET picture2 = ? WHERE id = 47";
    const sql = "UPDATE product SET ? WHERE id = ?";
    db.query(sql, [classifiedsadd, id], (err, results) => {
      if (err) {
        res.send(err);
      } else {
        res.json({ success: 1 });
        // res.send("suc");
      }
      //	res.json({ success: 1 }) ;
      //   res.send(id+"");
    });
  });

  //res.send(id+"");
});

// recupere les details d'un produit
app.post("/product_detail", (req, res) => {
  const id = req.body.id;

  db.query("SELECT * FROM product WHERE id = ?", id, (err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.send(result);
    }
  });
});

// modification d'un produit
app.post("/edit_product", async (req, res) => {
  const seller_id = req.body.seller_id;
  const id_product = req.body.id_product;
  const nom = req.body.nom;
  const description = req.body.description;
  const categorieid = req.body.categorieid;
  const souscategorieid = req.body.souscategorieid;
  const sous_soucategorieid = req.body.sous_soucategorieid;
  const prix_achat = req.body.prix_achat;
  const prix_vente = req.body.prix_vente;
  const stock = req.body.stock;
  const discount_type = req.body.discount_type;
  const discount_value = req.body.discount_value;
  const picture1 =
    "C:/Users/Vital/planetech_project/back_planetech/uploads/wallpaperflare.com_wallpaper(13).jpg";
  db.query(
    "UPDATE product SET name = ?, description = ?, purchase_price = ?, selling_price = ?, picture1 = ?, id_category = ?, id_sub_category = ?, id_sub_sub_category = ?, discount_type = ?, stock = ?, seller_id = ?, discount_value = ? WHERE id = ?",
    [
      nom,
      description,
      prix_achat,
      prix_vente,
      picture1,
      categorieid,
      souscategorieid,
      sous_soucategorieid,
      discount_type,
      stock,
      seller_id,
      discount_value,
      id_product,
    ],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        res.send("suc");
      }
    }
  );
});
// app.post("/get_invoice_comand_validation", async (req, res) => {
//   try {
//     const [maxIdRow] = await db.query(
//       "SELECT MAX(id) AS id FROM command_validation"
//     );

//     let id = maxIdRow.id || 0;

//     if (id === 0) {
//       // Aucun enregistrement trouvé, utilisez 1 comme ID
//       id = 1;
//     }

//     const [invoiceRow] = await db.query(
//       "SELECT * FROM command_validation WHERE id = ?",
//       [id]
//     );

//     if (!invoiceRow) {
//       // Gérez le cas où aucune ligne n'est trouvée
//       res.status(404).send("Aucun enregistrement trouvé");
//       return;
//     }

//     const numfin = parseInt(invoiceRow.invoice.slice(5));
//     const newnum = numfin + 1;
//     const invoice = `FAB00${newnum}`;

//     res.send(invoice);
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Erreur interne du serveur");
//   }
// });

app.post("/get_invoice_comand_validation", (req, res) => {
  let numfin = 0;
  let newnum = 0;
  let id = 0;
  let invoice = "";

  db.query("SELECT * FROM command_validation", (err, result) => {
    if (err) {
      console.log(err);
    } else {
      if (result[0]) {
        db.query(
          "SELECT MAX(id) AS id FROM command_validation",
          (err, result) => {
            if (err) {
              console.log(err);
            } else {
              id = result[0].id;
              db.query(
                "SELECT * FROM command_validation WHERE id = ?",
                id,
                (err, result) => {
                  if (err) {
                    console.log(err);
                  } else {
                    numfin = parseInt(result[0].invoice.slice(5));
                    newnum = numfin + 1;
                    invoice = `FAB00${newnum}`;
                    res.send(invoice);
                  }
                }
              );
            }
          }
        );
      } else {
        invoice = `FAB00${1}`;
        res.send(invoice);
        // res.send("aucune valeur trouver")
      }
      // res.send(result);
    }
  });
});

app.post("/ajoutcommand", (req, res) => {
  const status = 3;
  const picture1 =
    "C:/Users/Vital/planetech_project/back_planetech/uploads/wallpaperflare.com_wallpaper(13).jpg";
  const seller_id = req.body.seller_id;
  const product_quantity = req.body.product_quantity;
  const total_price = req.body.total_price;
  const unite_price = req.body.unite_price;
  const product_name = req.body.product_name;
  const product_id = req.body.product_id;
  const stock = req.body.stock;
  const invoice = req.body.invoice;
  const total_sold = req.body.total_sold;

  db.query(
    "INSERT INTO commands (product_quantity, total_price , unite_price , product_name, product_id, stock, invoice, picture, seller_id, status_id_command, total_sold) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
    [
      product_quantity,
      total_price,
      unite_price,
      product_name,
      product_id,
      stock,
      invoice,
      picture1,
      seller_id,
      status,
      total_sold,
    ],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        res.send("succes");
      }
    }
  );
});

// créer une commade validation
app.post("/ajoutcomand_validation", (req, res) => {
  const totalquant = req.body.totalquant;
  const totalprix = req.body.totalprix;
  const invoice = req.body.invoice;
  const status = 3;
  const whatsapp = req.body.whatsapp;
  const seller_id = req.body.seller_id;

  db.query(
    "INSERT INTO command_validation (invoice, total_quantity, total_price, status_id_command, whatsapp, seller_id) VALUES (?,?,?,?,?,?)",
    [invoice, totalquant, totalprix, status, whatsapp, seller_id],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        res.send("suc");
      }
    }
  );
});
// reduire le stock du produit
app.post("/reducquant", (req, res) => {
  const stock = req.body.stock;
  const product_id = req.body.product_id;
  const seller_id = req.body.seller_id;
  const total_sold = req.body.total_sold;
  const caisse = req.body.caisse;
  db.query(
    "UPDATE product SET stock = ?, total_sold = ?  WHERE id = ? and seller_id = ?",
    [stock, total_sold, product_id, seller_id],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        // res.send("success");
        db.query(
          "UPDATE caisse SET caisse = ? where id = ?",
          [caisse, 3],
          (err, result) => {
            if (err) {
              console.log(err);
            } else {
              res.send("success");
            }
          }
        );
      }
    }
  );
});

// recupere toutes les commandes
app.get("/get_commands", (req, res) => {
  db.query("SELECT * FROM commands", (err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.send(result);
    }
  });
});

// recupere toutes les commandes validations
app.get("/get_commands_validation", (req, res) => {
  db.query("SELECT * FROM command_validation ", (err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.send(result);
    }
  });
});
// recupere toutes les commandes validations
app.get("/get_caisse", (req, res) => {
  db.query("SELECT * FROM caisse ", (err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.send(result);
    }
  });
});

// mettre a jour la status de la commande
app.post("/majstatut", (req, res) => {
  const invoice = req.body.invoice;
  const status = req.body.status;
  const seller_id = req.body.seller_id;
  db.query(
    "UPDATE command_validation SET status_id_command = ? WHERE invoice = ? and seller_id = ?",
    [status, invoice, seller_id],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        db.query(
          "UPDATE commands SET status_id_command = ? WHERE invoice = ? and seller_id = ?",
          [status, invoice, seller_id],
          (err, result) => {
            if (err) {
              console.log(err);
            } else {
              res.send("success");
            }
          }
        );
        // res.send("success");
      }
    }
  );
});

// créer une commande VALIDATION DEPUIS LE CLIENT
app.post("/ajoutcomand_validation_client", (req, res) => {
  const totalquant = req.body.totalquant;
  const totalprix = req.body.totalprix;
  const invoice = req.body.invoice;
  const whatsapp = req.body.whatsapp;
  const seller_id = req.body.seller_id;
  const status_paiement = req.body.status_paiement;
  const status_id_command = 1;
  // if (status_paiement == "NON PAYER") {
  //   db.query(
  //     "INSERT INTO command_validation (invoice, total_quantity, total_price, whatsapp , seller_id, status_paiement, status_id_command) VALUES (?,?,?,?,?,?,?)",
  //     [
  //       invoice,
  //       totalquant,
  //       totalprix,
  //       whatsapp,
  //       seller_id,
  //       status_paiement,
  //       status_id_command,
  //     ],
  //     (err, result) => {
  //       if (err) {
  //         console.log(err);
  //       } else {
  //         res.send("suc");
  //       }
  //     }
  //   );
  // } else {
  db.query(
    "INSERT INTO command_validation (invoice, total_quantity, total_price, whatsapp, seller_id, status_paiement, status_id_command) VALUES (?,?,?,?,?,?,?)",
    [
      invoice,
      totalquant,
      totalprix,
      whatsapp,
      seller_id,
      status_paiement,
      status_id_command,
    ],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        res.send("suc");
      }
    }
  );
  // }
});

//cree la liste de commande de produit depuis le client
app.post("/ajoutcommand_client", (req, res) => {
  const status = 1;
  const whatsapp = req.body.whatsapp;
  const product_quantity = req.body.product_quantity;
  const total_price = req.body.total_price;
  const unite_price = req.body.unite_price;
  const product_name = req.body.product_name;
  const product_id = req.body.product_id;
  const stock = req.body.stock;
  const picture = req.body.picture;
  const seller_id = req.body.seller_id;
  const total_sold = req.body.total_sold;
  const invoice = req.body.invoice;

  db.query(
    "INSERT INTO commands (product_quantity, total_price , unite_price , product_name, product_id, stock, invoice, whatsapp, picture, seller_id, status_id_command, total_sold) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
    [
      product_quantity,
      total_price,
      unite_price,
      product_name,
      product_id,
      stock,
      invoice,
      whatsapp,
      picture,
      seller_id,
      status,
      total_sold,
    ],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        res.send("success");
      }
    }
  );
});

// ajout de lapprovisionnement 
app.post("/ajoutappro", (req, res) => {
  const stock_appro = req.body.stock_appro;
  const total_price = req.body.total_price;
  const unite_price = req.body.unite_price;
  const product_name = req.body.product_name;
  const product_id = req.body.product_id;
  const stock_preview = req.body.stock_preview;
  let invoice = 0;
  const seller_id = req.body.seller_id;
  db.query(
    "INSERT INTO approvisionnement (stock_appro, total_price , unite_price , product_name, product_id, invoice, stock_preview, seller_id) VALUES (?,?,?,?,?,?,?,?)",
    [
      stock_appro,
      total_price,
      unite_price,
      product_name,
      product_id,
      invoice,
      stock_preview,
      seller_id,
    ],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        /* res.json({ind:i}); */
        res.send("suc");
      }
    }
  );
});


app.post("/maj_stock_appro", (req, res) => {
  const stock = req.body.stock;
  const product_id = req.body.product_id;
  const seller_id = req.body.seller_id;
  db.query(
    "UPDATE product SET stock = ?  WHERE id = ? and seller_id = ?",
    [stock, product_id, seller_id],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        res.send("suc");
      }
    }
  );
});