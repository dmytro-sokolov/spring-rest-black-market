traverson.registerMediaType(TraversonJsonHalAdapter.mediaType,
    TraversonJsonHalAdapter);

var rootUri = '/';
var api = traverson.from(rootUri);

var View = Backbone.View.extend({
    el: $(".container"),
    initialize: function () {
        _.bindAll(this, "render");
        this.model.bind("change", this.render);
    },
    render: function() {
        var $tbody = this.$("#ads-list tbody");
        $tbody.empty();
        _.each(this.model.embedded("ads"), function(data) {
            $tbody.append(new adView({ model : data }).render().el);
        }, this);
    }
});

var adView = Backbone.View.extend({
    tagName : "tr",
    template : _.template($("#ad-template").html()),
    render : function() {
        this.$el.html(this.template(this.model));
        return this;
    },
    events: {
        "click": function(e) {
            form.model.set(this.model);
            ad = new AdsModel(this.model);
            controller.getOperations(ad);
        }
    }
});

var AdsModel = Backbone.RelationalHalResource.extend({});

var ads = new AdsModel();
var ad;
api.jsonHal()
    .follow('ads', 'search', 'my')
    .getUri(function(err, uri) {
        if (err) {
            console.log(err);
            return;
        }
        ads.url = uri;
        ads.fetch();
    });

var view = new View({ model: ads }).render();

var order = new Backbone.RelationalHalResource({
    location: {
        city: "Kyiv"
    },
    user: "user/1" //TODO add discoverable
});


api.jsonHal()
    .follow('ads')
    .getUri(function(err, uri) {
        if (err) {
            console.log(err);
            return;
        }
        order.url = uri;
    });

api.jsonHal()
    .follow('users', 'search', 'current-user')
    .getResource(function(err, res) {
        if (err) {
            console.log(err);
            return;
        }
        order.set("user", res._links.self.href);
    });
var fields = [{
    name: "amount",
    label: "Колличество:",
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
},
{
    name: "create hide",
    control: "button",
    label: "Создать"
},
{
    name: "update hide",
    control: "button",
    label: "Обновить"
},
{
    name: "delete hide",
    control: "button",
    label: "Удалить"
},
{
    name: "publish hide",
    control: "button",
    label: "Опубликовать"
}];

var form = new Backform.Form({
    el: $("#form"),
    model: order,
    fields: fields,

    events: {
        "click .update": function(e) {
            e.preventDefault();
            this.model.sync("patch", this.model, { url: ad.link("update").href() })
                .done(function(result) {
                    ads.fetch();
                })
                .fail(function(error) {
                    console.error(error);
                });
            return false;
        },
        "click .create": function(e) {
            e.preventDefault();
            console.log(e);
        },
        "click .publish": function(e) {
            e.preventDefault();
            this.model.sync("patch", this.model, { url: ad.link("publish").href() })
                .done(function(result) {
                    ads.fetch();
                })
                .fail(function(error) {
                    console.error(error);
                });
            return false;
        },
        "click .delete": function(e) {
            e.preventDefault();
            this.model.sync("delete", this.model, { url: ad.link("delete").href() })
                .done(function(result) {
                    ads.fetch();
                })
                .fail(function(error) {
                    console.error(error);
                });
            return false;
        }
    }
});

form.render();

var Controller = function(view) {
    var self = this;
    self.view = view;
    self.view.model.on("change", function() {
        self.view.$el.find(".publish").addClass("hide");
    });
};

Controller.prototype.getOperations =  function(ad) {
    ad.link("update") ? this.view.$el.find(".update").removeClass("hide") : "";
    ad.link("create") ? this.view.$el.find(".create").removeClassow("hide") : "";
    ad.link("publish") ? this.view.$el.find(".publish").removeClass("hide") : "";
    ad.link("delete") ? this.view.$el.find(".delete").removeClass("hide") : "";
};
var controller = new Controller(form);