traverson.registerMediaType(TraversonJsonHalAdapter.mediaType,
    TraversonJsonHalAdapter);

var rootUri = '/',
    api = traverson.from(rootUri),
    fields = [{
        name: "amount",
        label: "Количество:",
        control: "input",
        type: "number"
    }, {
        name: "currency",
        label: "Тип валюты:",
        control: "input"
    }, {
        name: "rate",
        label: "Курс:",
        control: "input",
        type: "number"
    }, {
        name: "type",
        label: "Тип ордера:",
        placeholder: "BUY or SELL",
        control: "input"
    }, {
        name: "location",
        label: "Город:",
        control: "input"
    }, {
        name: "comment",
        label: "Комментарий:",
        control: "input"
    }, {
        name: "ctrl create",
        control: "button",
        label: "Создать"
    }, {
        name: "ctrl update hide",
        control: "button",
        label: "Обновить"
    }, {
        name: "ctrl delete hide",
        control: "button",
        label: "Удалить"
    }, {
        name: "ctrl finish hide",
        control: "button",
        label: "Закрыть"
    }, {
        name: "ctrl publish hide",
        control: "button",
        label: "Опубликовать"
    }];

var View = Backbone.View.extend({
    el: $(".container"),
    initialize: function () {
        _.bindAll(this, "render");
        this.model.bind("change reset", this.render);
    },
    render: function () {
        var $tbody = this.$("#ads-list tbody");
        $tbody.empty();
        _.each(this.model.models, function (data) {
            $tbody.append(new adView({model: data}).render().el);
        }, this);
    },
    events: {
        "click #createNew": function (e) {
            e.preventDefault();
            var user = form.model.get("user");
            form.model.clear();
            form.model.set("user", user);
            controller.createNew();
        }
    }
});

var adView = Backbone.View.extend({
    tagName: "tr",
    template: _.template($("#ad-template").html()),
    render: function () {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    },
    events: {
        "click": function () {
            form.model.set(this.model.toJSON());
            controller.getOperations(this.model);
        }
    }
});

var AdsModel = Backbone.RelationalHalResource.extend({
    initialize: function () {
        var self = this;
        api.jsonHal()
            .follow("ads")
            .getUri(function (err, uri) {
                if (err) {
                    console.log(err);
                    return;
                }
                self.halUrl = uri;
            });
    }
});

var OrdersResource = Backbone.RelationalHalResource.extend({
    initialize: function (options) {
        var self = this;
        console.log(options);
        api.jsonHal()
            .follow("ads", "search", "my")
            .getUri(function (err, uri) {
                if (err) {
                    console.log(err);
                    return;
                }
                self.url = uri;
                self.updateCollection();
            });
        api.jsonHal()
            .follow("users", "search", "current-user")
            .getResource(function (err, res) {
                if (err) {
                    console.log(err);
                    return;
                }
                self.set("user", res._links.self.href); //TODO save and use for make create
            });
    },

    updateCollection: function () {
        var self = this;
        self.fetch().done(function () {
            var models = self.embedded("ads", {all: true});
            models = models.map(function (model) {
                return new AdsModel(model);
            });
            adsCollection.reset(models);
        });
    }
});


var ads = new AdsModel();
var adsCollection = new Backbone.Collection();
new View({model: adsCollection}).render();
var ordersResource = new OrdersResource();


var form = new Backform.Form({
    el: $("#form"),
    model: new AdsModel(),
    fields: fields,
    events: {
        "click .update": function (e) {
            e.preventDefault();
            controller.makeAction("update", this.model.toJSON());
            return false;
        },
        "click .create": function (e) {
            e.preventDefault();
            this.model.set("location", {city: this.model.get("location")}); //TODO nested trick
            this.model.set("user", ordersResource.get("user"));
            controller.makeAction("create", this.model.toJSON());
            this.model.set("location", this.model.get("location").city);
            return false;
        },
        "click .publish": function (e) {
            e.preventDefault();
            controller.makeAction("publish", this.model.toJSON());
            return false;
        },
        "click .finish": function (e) {
            e.preventDefault();
            this.model.set("status", "OUTDATED");
            controller.makeAction("finish", this.model.toJSON());
            return false;
        },
        "click .delete": function (e) {
            e.preventDefault();
            controller.makeAction("delete", this.model.toJSON());
            return false;
        }
    }
}).render();

var Controller = function (view) {
    var self = this;
    self.view = view;
};

Controller.prototype.setModel = function (model) {
    this.model = model;
};

Controller.prototype.getOperations = function (model) {
    this.setModel(model);
    ["update", "create", "publish", "delete", "finish"].forEach(function(relation) {
        this.initOperation(model, relation);
    }, this);
};

Controller.prototype.initOperation = function (model, relation) {
    model.hasLink(relation) ? this.view.$el.find("." + relation).removeClass("hide") : this.view.$el.find("." + relation).addClass("hide");
};

Controller.prototype.createNew = function () {
    this.setModel(ads);
    var user = this.view.model.get("user");
    this.view.model.clear();
    this.view.model.set("user", user);
    this.view.$el.find(".form-group.ctrl:not(.create)").addClass("hide");
    this.view.$el.find(".create").removeClass("hide");
};
Controller.prototype.setModel = function (model) {
    this.model = model;
};

Controller.prototype.getModel = function () {
    return this.model || ads;
};

Controller.prototype.makeAction = function (action, data) {
    var self = this,
        model = this.getModel(),
        options = {},
        actions = {
            "create": "create",
            "update": "patch",
            "publish": "create",
            "finish": "create",
            "delete": "delete"
        };

    if (action !== "create") {
        options = {
            url: model.link(action).href()
        }
    }
    model.set(data, {silent: true});
    model.sync(actions[action], model, options)
        .done(function () {
            ordersResource.updateCollection();
            self.createNew();
        })
        .fail(function (error) {
            console.error(error);
        });
};

var controller = new Controller(form);