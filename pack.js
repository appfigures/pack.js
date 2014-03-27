(function () {
    var global = this;

    var extend = function (dst, src) {
            for (var prop in src) {
                dst[prop] = src[prop];
            }
            return dst;
        },
        getTime = function () {
            return (new Date()).getTime();
        };

    //
    // Physics Engine
    //

    // Base

    function Rectangle(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
    Rectangle.prototype.translate = function (x, y) {
        this.x += x;
        this.y += y;
    };

    Object.defineProperty(Rectangle.prototype, 'left', {
        get: function() {
            return this.x;
        }
    });
    Object.defineProperty(Rectangle.prototype, 'right', {
        get: function() {
            return this.x + this.width;
        }
    });
    Object.defineProperty(Rectangle.prototype, 'top', {
        get: function() {
            return this.y;
        }
    });
    Object.defineProperty(Rectangle.prototype, 'bottom', {
        get: function() {
            return this.y + this.height;
        }
    });

    // Collisions

    function solveCollisions(objects) {
        var i, j, len = objects.length,
            a, b, count = 0;
        for (i = 0; i < len; ++i) {
            a = objects[i];
            for (j = i + 1; j < len; ++j) {
                b = objects[j];
                if (solveCollision(a, b)) {
                    ++count;
                }
            }
        }

        return count;
    }

    // The value to push segment b away from segment a (1D)
    function separateSegments(aMin, aMax, bMin, bMax) {
        var aMid, bMid;

        if (aMin >= bMax ||
            bMin >= aMax) {
            return 0;
        }

        aMid = (bMin + bMax) / 2;
        bMid = (aMin + aMax) / 2;

        if (aMid > bMid) {
            return aMax - bMin;
        } else {
            return aMin - bMax;
        }
    }

    // Return the vector which pushes rectangle b out of a
    function separateRects(a, b) {
        var xSeparation, ySeparation;

        xSeparation = separateSegments(a.left, a.right, b.left, b.right);

        if (!xSeparation) return null;

        ySeparation = separateSegments(a.top, a.bottom, b.top, b.bottom);

        if (!ySeparation) return null;

        if (Math.abs(xSeparation) < Math.abs(ySeparation)) {
            return {
                x: xSeparation,
                y: 0
            };
        } else {
            return {
                x: 0,
                y: ySeparation
            };
        }
    }

    function solveCollision(a, b) {
        var shapeA = a.getBounds(),
            shapeB = b.getBounds(),
            push = separateRects(shapeA, shapeB),
            totalMass;

        if (!push) return false;

        totalMass = a.mass + b.mass;

        if (b.mass > 0) {
            b.x += push.x * (a.mass / totalMass);
            b.y += push.y * (a.mass / totalMass);
        }

        if (a.mass > 0) {
            a.x += -push.x * (b.mass / totalMass);
            a.y += -push.y * (b.mass / totalMass);
        }

        return true;
    }

    /////

    function Shape(x, y) {
        this.x = x || 0;
        this.y = y || 0;
    }
    Shape.prototype = {
        x: 0,
        y: 0,
        getBounds: function () {
            return new Rectangle(this.x, this.y);
        }
    };

    function RectangleShape(x, y, width, height) {
        Shape.call(this, x, y);
        this.width = width;
        this.height = height;
    }
    RectangleShape.prototype = Object.create(Shape.prototype);
    RectangleShape.prototype.getBounds = function () {
        return new Rectangle(this.x - (this.width * 0.5), this.y - (this.height * 0.5), this.width, this.height);
    };

    ////

    function DynamicObject() {
    }
    DynamicObject.prototype = {
        x: 0,
        y: 0,
        mass: 1,
        shape: null,
        getBounds: function () {
            var bounds = this.shape.getBounds();
            bounds.translate(this.x, this.y);
            return bounds;
        }
    };

    // World
    function World() {
        this.objects = [];
        this.magnets = [];
    }
    World.prototype = {
        objects: null,
        magnets: null,
        step: function (dt, collisionIterations) {
            this.simulate(dt);
            this.solveCollisions(collisionIterations);
        },
        simulate: function (dt) {
            var objects = this.objects, i, len = objects.length, object,
                magnets = this.magnets, j, len2 = magnets.length, magnet;

            for (i = 0; i < len; ++i) {
                object = objects[i];

                if (object.fixed) break;

                // This isn't a super real simulation (no velocity) but it works
                // for our needs

                for (j = 0; j < len2; ++j) {
                    magnet = magnets[j];

                    object.x += (magnet.x - object.x) * 0.25;
                    object.y += (magnet.y - object.y) * 0.25;
                }
            }
        },
        solveCollisions: function (iterations) {
            var i, unsolvedCollisions;
            iterations = iterations || 10;

            for (i = 0; i < iterations; ++i) {
                unsolvedCollisions = solveCollisions(this.objects);
                if (unsolvedCollisions === 0) break;
            }
        }
    };

    //
    // Packer
    //

    function Packer() {
        this.world = new World();
    }
    Packer.prototype = {
        addRect: function (x, y, width, height) {
            var object = new DynamicObject();

            object.x = x;
            object.y = y;
            object.shape = new RectangleShape(0, 0, width, height);

            this.world.objects.push(object);

            return object;
        },
        render: function (canvas, options) {
            options = extend({
                xOffset: 0,
                yOffset: 0,
                scale: 1
            }, options);

            var scale = options.scale,
                xOffset = options.xOffset,
                yOffset = options.yOffset;

            var context = canvas.getContext('2d');

            context.clearRect(0, 0, canvas.width, canvas.height);
            context.fillStyle = "rgb(200,0,0)";
            context.strokeStyle="#aaa";

            this.world.objects.forEach(function (object) {
                // Assume rectangle
                var bounds = object.getBounds();
                context.strokeRect(bounds.x * scale + xOffset, bounds.y * scale + yOffset, bounds.width * scale, bounds.height * scale);
                context.strokeRect((object.x * scale - 2) + xOffset, (object.y * scale - 2) + yOffset, 4, 4);
            });
        },
        addMagnet: function (x, y) {
            var magnet = {x: x, y: y};
            this.world.magnets.push(magnet);
            return magnet;
        },
        pack: function (options) {
            var world = this.world, i, interval, execTime = 0;

            options = extend({
                dt: 1/30,
                interval: 0,
                collisionIterations: 100,
                duration: 0.5,
                async: false,
                progress: null,
                done: null
            }, options);

            var numFrames = Math.round(options.duration / options.dt);

            if (!options.async) {
                for (i = 0; i < numFrames; ++i) {
                    onFrame();
                }
                lastFrame();
            } else {
                i = 0;
                interval = setInterval(function () {
                    onFrame();
                    if (options.progress) options.progress();

                    if (i++ > numFrames) {
                        clearInterval(interval);
                        lastFrame();
                    }
                }, options.interval || options.dt * 1000);
            }

            function onFrame() {
                var t = getTime();
                world.step(options.dt, options.collisionIterations);
                execTime += (getTime() - t);
            }
            function lastFrame() {
                var t = getTime();
                world.solveCollisions(options.collisionIterations);
                execTime += (getTime() - t);
                if (options.done) options.done(execTime);
            }
        }
    };

    // Export
    global.pack = {
        Packer: Packer,
        World: World,
        DynamicObject: DynamicObject,
        RectangleShape: RectangleShape
    };
}());