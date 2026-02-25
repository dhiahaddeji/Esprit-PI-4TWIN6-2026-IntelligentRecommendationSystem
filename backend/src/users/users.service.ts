import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async findByEmail(email: string) {
    return this.userModel.findOne({ email });
  }

  async updateOnlineStatus(userId: string, status: boolean) {
    return this.userModel.findByIdAndUpdate(userId, { en_ligne: status });
  }

  async create(data: any) {
    const hashed = await bcrypt.hash(data.password, 10);
    const user = new this.userModel({
      ...data,
      password: hashed
    });
    return user.save();
  }

  async update(id: string, data: any) {
    // Si le mot de passe est fourni, on le hashe
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    
    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, data, { new: true })
      .select('-password')
      .exec();
    
    if (!updatedUser) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    
    return updatedUser;
  }

  async delete(id: string) {
    return this.userModel.findByIdAndDelete(id);
  }

  async findAll() {
    // Exclure les mots de passe de la réponse
    return this.userModel.find().select('-password').exec();
  }

  // ✅ NOUVELLE MÉTHODE : findById
  async findById(id: string) {
    const user = await this.userModel
      .findById(id)
      .select('-password')
      .exec();
    
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    
    return user;
  }

  async findByMatricule(matricule: string) {
  return this.userModel.findOne({ matricule });
}
}