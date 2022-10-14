import strings from '../config/app.config.js';
import Product from '../models/Product.js';
import Cart from '../models/Cart.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import Env from '../config/env.config.js';
import escapeStringRegexp from 'escape-string-regexp';
import fs from 'fs';
import path from 'path';
import { v1 as uuid } from 'uuid';

const CDN_PRODUCTS = process.env.SC_CDN_PRODUCTS;
const CDN_TEMP_PRODUCTS = process.env.SC_CDN_TEMP_PRODUCTS;

export const uploadImage = (req, res) => {
    try {
        if (!fs.existsSync(CDN_TEMP_PRODUCTS)) {
            fs.mkdirSync(CDN_TEMP_PRODUCTS, { recursive: true });
        }

        const filename = `${uuid()}_${Date.now()}${path.extname(req.file.originalname)}`;
        const filepath = path.join(CDN_TEMP_PRODUCTS, filename);

        fs.writeFileSync(filepath, req.file.buffer);
        return res.json(filename);
    } catch (err) {
        console.error(strings.ERROR, err);
        return res.status(400).send(strings.ERROR + err);
    }
};

export const deleteTempImage = (req, res) => {
    try {
        const _image = path.join(CDN_TEMP_PRODUCTS, req.params.fileName);
        if (fs.existsSync(_image)) {
            fs.unlinkSync(_image);
        }
        return res.sendStatus(200);
    } catch (err) {
        console.error(strings.ERROR, err);
        return res.status(400).send(strings.ERROR + err);
    }
};

export const create = async (req, res) => {

    let product;
    try {
        const { name, description, categories, image: imageFile, price, quantity, soldOut, hidden } = req.body;
        const __product = { name, description, categories, price, quantity, soldOut, hidden };

        product = new Product(__product);
        await product.save();

        const _image = path.join(CDN_TEMP_PRODUCTS, imageFile);
        if (fs.existsSync(_image)) {
            const filename = `${product._id}_${Date.now()}${path.extname(imageFile)}`;
            const newPath = path.join(CDN_PRODUCTS, filename);

            fs.renameSync(_image, newPath);
            product.image = filename;
        } else {
            await Product.deleteOne({ _id: product._id });
            const err = 'Image file not found';
            console.error(strings.ERROR, err);
            return res.status(400).send(strings.ERROR + err);
        }

        await product.save();
        return res.status(200).json(product);
    } catch (err) {
        if (product && product._id) await Product.deleteOne({ _id: product._id });
        console.error(strings.ERROR, err);
        return res.status(400).send(strings.ERROR + err);
    }
};

export const update = async (req, res) => {
    try {
        const { _id, categories, name, description, image, price, quantity, soldOut, hidden } = req.body;
        const product = await Product.findById(_id);

        if (product) {
            product.name = name;
            product.description = description;
            product.categories = categories;
            product.price = price;
            product.quantity = quantity;
            product.soldOut = soldOut;
            product.hidden = hidden;

            if (image) {
                if (!fs.existsSync(CDN_PRODUCTS)) {
                    fs.mkdirSync(CDN_PRODUCTS, { recursive: true });
                }

                const oldImage = path.join(CDN_PRODUCTS, product.image);
                if (fs.existsSync(oldImage)) {
                    fs.unlinkSync(oldImage);
                }

                const filename = `${product._id}_${Date.now()}${path.extname(image)}`;
                const filepath = path.join(CDN_PRODUCTS, filename);

                const tempImagePath = path.join(CDN_TEMP_PRODUCTS, image);
                fs.renameSync(tempImagePath, filepath);
                product.image = filename;
            }

            await product.save();
            return res.status(200).json(product);
        } else {
            const err = `Product ${_id} not found`;
            console.error(strings.ERROR, err);
            return res.status(400).send(strings.ERROR + err);
        }
    } catch (err) {
        console.error(strings.ERROR, err);
        return res.status(400).send(strings.ERROR + err);
    }
};

export const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);

        if (product) {
            const _image = path.join(CDN_PRODUCTS, product.image);
            if (fs.existsSync(_image)) {
                fs.unlinkSync(_image);
            }
        } else {
            return res.sendStatus(204);
        }

        return res.sendStatus(200);
    } catch (err) {
        console.error(strings.ERROR, err);
        return res.status(400).send(strings.ERROR + err);
    }
};

export const getProduct = async (req, res) => {
    try {
        const id = mongoose.Types.ObjectId(req.params.id);

        const product = await Product.findById(id)
            .populate('categories')
            .lean();

        if (product) {
            return res.json(product);
        } else {
            return res.sendStatus(204);
        }
    } catch (err) {
        console.error(strings.ERROR, err);
        return res.status(400).send(strings.ERROR + err);
    }
};
export const getBackendProducts = async (req, res) => {
    try {
        const { user: userId } = req.params;

        const user = await User.find({ _id: userId, type: Env.USER_TYPE.ADMIN });

        if (!user) {
            const err = `[product.getBackendProducts] admin user ${userId} not found.`;
            console.error(err);
            return res.status(204).send(err);
        }

        const page = parseInt(req.params.page);
        const size = parseInt(req.params.size);
        const keyword = escapeStringRegexp(req.query.s || '');
        const options = 'i';

        let category;
        if (req.params.category) {
            category = mongoose.Types.ObjectId(req.params.category);
        }

        let $match;
        if (category) {
            $match = {
                $and: [
                    {
                        categories: category
                    },
                    {
                        name: { $regex: keyword, $options: options }
                    }
                ]
            };
        } else {
            $match = {
                name: { $regex: keyword, $options: options }
            };
        }

        const products = await Product.aggregate([
            {
                $match
            },
            {
                $project: {
                    categories: 0
                }
            },
            {
                $facet: {
                    resultData: [
                        { $sort: { createdAt: -1 } },
                        { $skip: ((page - 1) * size) },
                        { $limit: size },
                    ],
                    pageInfo: [
                        {
                            $count: 'totalRecords'
                        }
                    ]
                }
            }
        ], { collation: { locale: Env.DEFAULT_LANGUAGE, strength: 2 } });

        return res.json(products);
    } catch (err) {
        console.error(strings.ERROR, err);
        return res.status(400).send(strings.ERROR + err);
    }
};

export const getFrontendProducts = async (req, res) => {
    try {
        const page = parseInt(req.params.page);
        const size = parseInt(req.params.size);
        const keyword = escapeStringRegexp(req.query.s || '');
        const options = 'i';

        let category;
        if (req.params.category) {
            category = mongoose.Types.ObjectId(req.params.category);
        }

        let cart, cartProducts = [];
        if (req.body.cart) {
            cart = mongoose.Types.ObjectId(req.body.cart);

            const _cart = await Cart.findById(cart)
                .populate('cartItems')
                .lean();

            if (_cart) {
                cartProducts = _cart.cartItems.map(cartItem => cartItem.product);
            }
        }

        let $match;
        if (category) {
            $match = {
                $and: [
                    {
                        categories: category
                    },
                    {
                        name: { $regex: keyword, $options: options }
                    },
                    {
                        hidden: false
                    }
                ]
            };
        } else {
            $match = {
                $and: [
                    {
                        name: { $regex: keyword, $options: options }
                    },
                    {
                        hidden: false
                    }
                ]
            };
        }

        // TODO after: sort by price asc, desc
        const products = await Product.aggregate([
            {
                $match
            },
            {
                $addFields: {
                    inCart: {
                        $cond: [{ $in: ['$_id', cartProducts] }, 1, 0]
                    }
                }
            },
            {
                $project: {
                    categories: 0
                }
            },
            {
                $facet: {
                    resultData: [
                        { $sort: { createdAt: -1 } },
                        { $skip: ((page - 1) * size) },
                        { $limit: size },
                    ],
                    pageInfo: [
                        {
                            $count: 'totalRecords'
                        }
                    ]
                }
            }
        ], { collation: { locale: Env.DEFAULT_LANGUAGE, strength: 2 } });

        return res.json(products);

        return res.sendStatus(200);
    } catch (err) {
        console.error(strings.ERROR, err);
        return res.status(400).send(strings.ERROR + err);
    }
};